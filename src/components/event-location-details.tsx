"use client";

import { useEffect, useMemo, useState } from "react";

type Coordinates = {
  lat: number;
  lon: number;
};

function formatCoordinates(input: Coordinates) {
  return `${input.lat},${input.lon}`;
}

function calculateDistanceKm(start: Coordinates, end: Coordinates) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(end.lat - start.lat);
  const deltaLon = toRad(end.lon - start.lon);
  const startLat = toRad(start.lat);
  const endLat = toRad(end.lat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function EventLocationDetails({ location }: { location: string }) {
  const normalizedLocation = location.trim();
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [canReadCurrentLocation, setCanReadCurrentLocation] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDestination() {
      try {
        const response = await fetch(`/api/location/geocode?q=${encodeURIComponent(normalizedLocation)}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          result: { lat: number; lon: number } | null;
        };

        if (!cancelled) {
          setDestination(payload.result);
        }
      } catch {
        // Geocoding ist optional, deshalb bewusst still.
      }
    }

    if (normalizedLocation) {
      void loadDestination();
    }

    return () => {
      cancelled = true;
    };
  }, [normalizedLocation]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCanReadCurrentLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setCanReadCurrentLocation(true);
      },
      () => {
        setCanReadCurrentLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 60_000
      }
    );
  }, []);

  const distanceKm = useMemo(() => {
    if (!destination || !currentLocation) {
      return null;
    }

    return calculateDistanceKm(currentLocation, destination);
  }, [currentLocation, destination]);

  const navigationHref = useMemo(() => {
    const params = new URLSearchParams({
      api: "1",
      destination: normalizedLocation
    });

    if (currentLocation) {
      params.set("origin", formatCoordinates(currentLocation));
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [currentLocation, normalizedLocation]);

  if (!normalizedLocation) {
    return null;
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Ort</p>
      <p className="mt-1 text-sm text-slate-700">{normalizedLocation}</p>
      {distanceKm !== null ? (
        <p className="mt-2 text-xs text-slate-600">
          Distanz ab aktuellem Standort:{" "}
          {distanceKm.toLocaleString("de-DE", {
            maximumFractionDigits: 1
          })}{" "}
          km
        </p>
      ) : canReadCurrentLocation === false ? (
        <p className="mt-2 text-xs text-slate-500">Distanz verfügbar, sobald dein aktueller Standort freigegeben ist.</p>
      ) : null}
      <a
        href={navigationHref}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
      >
        Route planen / navigieren
      </a>
    </section>
  );
}
