"use client";

import { useState } from "react";

/**
 * Zeigt ein Event-Vorschaubild. Bei Ladefehler (z. B. 403, 404) wird nichts gerendert,
 * damit kein kaputtes Bild-Icon erscheint.
 */
export function EventImage({
  src,
  alt = "",
  className,
  sizes,
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
