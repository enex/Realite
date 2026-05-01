import type { Area } from "react-easy-crop";

const TARGET_PROFILE_IMAGE_BYTES = 200 * 1024;

export function isHeicLike(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/heic" || t === "image/heif") {
    return true;
  }
  return /\.hei[cf]$/i.test(file.name);
}

export async function fileToImageObjectUrl(file: File): Promise<{
  url: string;
  revoke: () => void;
}> {
  if (isHeicLike(file)) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  }
  const url = URL.createObjectURL(file);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Bild konnte nicht geladen werden.")),
    );
    image.src = url;
  });
}

function canvasSupportsWebp(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

function blobFromCanvas(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob != null
          ? resolve(blob)
          : reject(new Error("Bildexport nicht unterstützt.")),
      mime,
      quality,
    );
  });
}

function downscaleCanvas(
  source: HTMLCanvasElement,
  factor: number,
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(source.width * factor));
  const h = Math.max(1, Math.round(source.height * factor));
  const next = document.createElement("canvas");
  next.width = w;
  next.height = h;
  const ctx = next.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas nicht verfügbar.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return next;
}

async function encodeCanvasNearByteSize(
  canvas: HTMLCanvasElement,
  targetBytes: number,
): Promise<Blob> {
  const mime = canvasSupportsWebp() ? "image/webp" : "image/jpeg";
  const hardMax = Math.round(targetBytes * 1.25);

  let work = canvas;

  for (let round = 0; round < 8; round += 1) {
    let low = 0.4;
    let high = 0.94;
    let best: Blob | null = null;
    for (let i = 0; i < 16; i += 1) {
      const q = (low + high) / 2;
      const blob = await blobFromCanvas(work, mime, q);
      if (blob.size > targetBytes) {
        high = q;
      } else {
        low = q;
        best = blob;
      }
    }
    const out =
      best ?? (await blobFromCanvas(work, mime, Math.min(0.45, high)));
    if (out.size <= hardMax) {
      return out;
    }
    work = downscaleCanvas(work, 0.85);
  }

  return blobFromCanvas(work, mime, 0.4);
}

export async function getCroppedProfileBlob(
  imageSrc: string,
  pixelCrop: Area,
  options?: { maxSide?: number; targetBytes?: number },
): Promise<Blob> {
  const maxSide = options?.maxSide ?? 1024;
  const targetBytes = options?.targetBytes ?? TARGET_PROFILE_IMAGE_BYTES;

  const image = await createImage(imageSrc);
  const sx = Math.max(0, Math.round(pixelCrop.x));
  const sy = Math.max(0, Math.round(pixelCrop.y));
  const sw = Math.min(Math.round(pixelCrop.width), image.naturalWidth - sx);
  const sh = Math.min(Math.round(pixelCrop.height), image.naturalHeight - sy);
  if (sw <= 0 || sh <= 0) {
    throw new Error("Ungültiger Ausschnitt.");
  }

  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas nicht verfügbar.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);

  return encodeCanvasNearByteSize(canvas, targetBytes);
}

export function profileBlobToUploadFile(blob: Blob): File {
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `profile.${ext}`, { type: blob.type });
}
