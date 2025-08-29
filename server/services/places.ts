import { z } from "zod";

const GOOGLE_PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

interface PlacesSearchOptions {
  query: string;
  limit?: number;
  types?: string[];
  bounds?: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
  userLocation?: {
    lat: number;
    lng: number;
  };
  radius?: number; // Radius in Metern
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  photos?: {
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }[];
}

const googlePlaceSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  formatted_address: z.string(),
  geometry: z.object({
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  types: z.array(z.string()),
  photos: z
    .array(
      z.object({
        photo_reference: z.string(),
        height: z.number(),
        width: z.number(),
        html_attributions: z.array(z.string()),
      })
    )
    .optional(),
});

// Schema für Text Search API (mehr Ergebnisse)
const textSearchResponseSchema = z.object({
  results: z.array(googlePlaceSchema),
  status: z.string(),
});

// Schema für Find Place API (Fallback)
const searchResponseSchema = z.object({
  candidates: z.array(googlePlaceSchema),
  status: z.string(),
});

// Schema für Place Details API mit Fotos
const placeDetailsSchema = z.object({
  result: z.object({
    place_id: z.string(),
    name: z.string(),
    formatted_address: z.string(),
    geometry: z.object({
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    }),
    types: z.array(z.string()),
    photos: z
      .array(
        z.object({
          photo_reference: z.string(),
          height: z.number(),
          width: z.number(),
          html_attributions: z.array(z.string()),
        })
      )
      .optional(),
  }),
  status: z.string(),
});

export class PlacesService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn("Google Places API key is required");
      //throw new Error("Google Places API key is required");
    }
    this.apiKey = apiKey;
  }

  async search(options: PlacesSearchOptions) {
    // Verwende Text Search API für mehr Ergebnisse
    const params = new URLSearchParams({
      query: options.query,
      key: this.apiKey,
    });

    // Berücksichtige Nutzerlocation für bessere Ergebnisse
    if (options.userLocation) {
      const { lat, lng } = options.userLocation;
      params.append("location", `${lat},${lng}`);
      // Verwende den übergebenen Radius oder Standard 50km
      const radiusInMeters = options.radius || 50000;
      params.append("radius", radiusInMeters.toString());
    }

    // Bounds haben Vorrang vor userLocation
    if (options.bounds) {
      const { ne, sw } = options.bounds;
      params.append(
        "location",
        `${(ne.lat + sw.lat) / 2},${(ne.lng + sw.lng) / 2}`
      );
      // Berechne Radius basierend auf Bounds oder verwende übergebenen Radius
      if (options.radius) {
        params.append("radius", options.radius.toString());
      } else {
        const latDiff = Math.abs(ne.lat - sw.lat);
        const lngDiff = Math.abs(ne.lng - sw.lng);
        const radius = (Math.max(latDiff, lngDiff) * 111000) / 2; // Ungefähr km zu Meter
        params.append("radius", Math.min(radius, 50000).toString());
      }
    }

    if (options.types && options.types.length > 0) {
      params.append("type", options.types.join("|"));
    }

    try {
      // Versuche zuerst Text Search API für mehr Ergebnisse
      const textSearchResponse = await fetch(
        `${GOOGLE_PLACES_API_BASE}/textsearch/json?${params.toString()}`
      );

      if (textSearchResponse.ok) {
        const textSearchData = await textSearchResponse.json();
        const textSearchParsed = textSearchResponseSchema.parse(textSearchData);

        if (textSearchParsed.status === "OK") {
          // Limitiere die Ergebnisse basierend auf dem limit Parameter
          const limitedResults = options.limit
            ? textSearchParsed.results.slice(0, options.limit)
            : textSearchParsed.results.slice(0, 25); // Standard: 25 Ergebnisse

          return limitedResults;
        }
      }
    } catch (error) {
      console.warn(
        "Text Search API failed, falling back to Find Place API:",
        error
      );
    }

    // Fallback zur ursprünglichen Find Place API
    const fallbackParams = new URLSearchParams({
      input: options.query,
      inputtype: "textquery",
      fields: "formatted_address,name,geometry,place_id,types",
      key: this.apiKey,
    });

    if (options.userLocation) {
      const { lat, lng } = options.userLocation;
      const radiusInMeters = options.radius || 50000;
      fallbackParams.append(
        "locationbias",
        `circle:${radiusInMeters}@${lat},${lng}`
      );
    }

    if (options.bounds) {
      const { ne, sw } = options.bounds;
      fallbackParams.append(
        "locationbias",
        `rectangle:${sw.lat},${sw.lng}|${ne.lat},${ne.lng}`
      );
    }

    const response = await fetch(
      `${GOOGLE_PLACES_API_BASE}/findplacefromtext/json?${fallbackParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = searchResponseSchema.parse(data);

    if (parsed.status !== "OK" && parsed.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${parsed.status}`);
    }

    return parsed.candidates;
  }

  async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<{
    city?: string;
    region?: string;
    regionCode?: string;
    country?: string;
    countryCode?: string;
    formattedAddress?: string;
  } | null> {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.apiKey,
      result_type: [
        "locality",
        "postal_town",
        "administrative_area_level_1",
        "country",
      ].join("|"),
    });

    const geocodeSchema = z.object({
      results: z.array(
        z.object({
          formatted_address: z.string(),
          address_components: z.array(
            z.object({
              long_name: z.string(),
              short_name: z.string(),
              types: z.array(z.string()),
            })
          ),
        })
      ),
      status: z.string(),
    });

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      const parsed = geocodeSchema.parse(data);
      if (parsed.status !== "OK" || parsed.results.length === 0) return null;

      const components = parsed.results[0]!.address_components;
      const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name;
      const getShort = (type: string) =>
        components.find((c) => c.types.includes(type))?.short_name;

      const city = get("locality") ?? get("postal_town");
      const region = get("administrative_area_level_1");
      const regionCode = getShort("administrative_area_level_1");
      const country = get("country");
      const countryCode = getShort("country");

      return {
        city: city ?? undefined,
        region: region ?? undefined,
        regionCode: regionCode ?? undefined,
        country: country ?? undefined,
        countryCode: countryCode ?? undefined,
        formattedAddress: parsed.results[0]!.formatted_address,
      };
    } catch (err) {
      console.warn("reverseGeocode failed", err);
      return null;
    }
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "place_id,name,formatted_address,geometry,types,photos",
      key: this.apiKey,
    });

    try {
      const response = await fetch(
        `${GOOGLE_PLACES_API_BASE}/details/json?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Place Details API error: ${response.statusText}`);
      }

      const data = await response.json();
      const parsed = placeDetailsSchema.parse(data);

      if (parsed.status !== "OK") {
        console.warn(`Place Details API error: ${parsed.status}`);
        return null;
      }

      return parsed.result;
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  }

  getPhotoUrl(photoReference: string, maxWidth = 400): string {
    const params = new URLSearchParams({
      photoreference: photoReference,
      maxwidth: maxWidth.toString(),
      key: this.apiKey,
    });

    return `${GOOGLE_PLACES_API_BASE}/photo?${params.toString()}`;
  }
}
