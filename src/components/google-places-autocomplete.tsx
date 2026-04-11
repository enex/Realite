"use client";

import { useEffect, useRef } from "react";

const MAX_LEN = 180;

let mapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsPlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }
  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }
  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-realite-google-maps]");
    if (existing) {
      const finish = () => {
        if (window.google?.maps?.places) resolve();
        else reject(new Error("Google Maps konnte nicht geladen werden"));
      };
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps konnte nicht geladen werden")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.dataset.realiteGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=de&region=DE`;
    script.onload = () => {
      if (window.google?.maps?.places) resolve();
      else reject(new Error("Google Maps konnte nicht geladen werden"));
    };
    script.onerror = () => reject(new Error("Google Maps konnte nicht geladen werden"));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

export type GooglePlacesAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

/**
 * Ortseingabe mit Google Places Autocomplete (Browser).
 * Ohne NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: normales Textfeld.
 */
export function GooglePlacesAutocomplete({
  id,
  value,
  onChange,
  placeholder = "Ort suchen …",
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (el.value !== value) {
      el.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!apiKey || disabled) {
      return;
    }
    const el = inputRef.current;
    if (!el) return;

    let cancelled = false;

    loadGoogleMapsPlacesScript(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "name", "geometry"],
          componentRestrictions: { country: ["de", "at", "ch"] },
        });
        autocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const text =
            place.formatted_address?.slice(0, MAX_LEN) ??
            place.name?.slice(0, MAX_LEN) ??
            "";
          if (text) {
            onChangeRef.current(text);
            if (inputRef.current) {
              inputRef.current.value = text;
            }
          }
        });
      })
      .catch(() => {
        /* still usable as plain text */
      });

    return () => {
      cancelled = true;
      const ac = autocompleteRef.current;
      autocompleteRef.current = null;
      if (ac && typeof google !== "undefined") {
        google.maps.event.clearInstanceListeners(ac);
      }
    };
  }, [apiKey, disabled]);

  const mergedClassName =
    className ??
    "w-full rounded-lg border border-input px-3 py-2 text-sm dark:border-white/20";

  if (!apiKey) {
    return (
      <input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_LEN))}
        placeholder={placeholder}
        className={mergedClassName}
        maxLength={MAX_LEN}
        autoComplete="street-address"
        aria-invalid={ariaInvalid}
      />
    );
  }

  return (
    <input
      id={id}
      ref={inputRef}
      type="text"
      defaultValue={value}
      disabled={disabled}
      onChange={(e) => onChangeRef.current(e.target.value.slice(0, MAX_LEN))}
      placeholder={placeholder}
      className={mergedClassName}
      maxLength={MAX_LEN}
      autoComplete="off"
      aria-invalid={ariaInvalid}
    />
  );
}
