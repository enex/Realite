import { z } from "zod";

import { os } from "@orpc/server";
import { PlacesService } from "../services/places";

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: "google" | "user" | "cached";
  photoUrl?: string;
  metadata?: {
    placeType?: string[];
    lastUsed?: Date;
    usageCount?: number;
  };
}

const placesService = new PlacesService(
  process.env.GOOGLE_PLACES_API_KEY ?? ""
);

export const locationRouter = {
  search: os
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional().default(25),
        types: z.array(z.string()).optional(),
        bounds: z
          .object({
            ne: z.object({ lat: z.number(), lng: z.number() }),
            sw: z.object({ lat: z.number(), lng: z.number() }),
          })
          .optional(),
        userLocation: z
          .object({
            lat: z.number(),
            lng: z.number(),
          })
          .optional(),
        radius: z.number().optional(), // Radius in Metern
        includePhotos: z.boolean().optional().default(false), // Neue Option für Fotos
      })
    )
    .handler(async ({ input }) => {
      const places = await placesService.search({
        query: input.query,
        limit: input.limit,
        types: input.types,
        bounds: input.bounds,
        userLocation: input.userLocation,
        radius: input.radius,
      });

      // Wenn Fotos angefordert werden, hole Details für jeden Ort
      const locationsWithPhotos = await Promise.all(
        places.map(async (place) => {
          let photoUrl: string | undefined = undefined;

          if (input.includePhotos) {
            try {
              const details = await placesService.getPlaceDetails(
                place.place_id
              );
              if (details?.photos && details.photos.length > 0) {
                photoUrl = placesService.getPhotoUrl(
                  details.photos[0]!.photo_reference,
                  400
                );
              }
            } catch (error) {
              console.warn(
                `Failed to fetch photo for place ${place.place_id}:`,
                error
              );
            }
          }

          return {
            id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            source: "google" as const,
            photoUrl,
            metadata: {
              placeType: place.types,
              lastUsed: new Date(),
              usageCount: 1,
            },
          };
        })
      );

      return {
        locations: locationsWithPhotos,
      };
    }),
};
