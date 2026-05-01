"use client";

import { Image as ImageIcon, UploadSimple } from "@phosphor-icons/react";
import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useId, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  fileToImageObjectUrl,
  getCroppedProfileBlob,
  isHeicLike,
  profileBlobToUploadFile,
} from "@/src/lib/profile-image-client-process";

const MAX_RAW_FILE_BYTES = 45 * 1024 * 1024;

type SinglesProfileImageFieldProps = {
  previewUrl: string | null;
  disabled?: boolean;
  busy?: boolean;
  onFileReady: (file: File) => void | Promise<void>;
  onError?: (message: string) => void;
  description?: string;
  helpText?: string;
};

export function SinglesProfileImageField({
  previewUrl,
  disabled = false,
  busy = false,
  onFileReady,
  onError,
  description = "Damit andere dich vor Ort wiedererkennen, am liebsten ein klares Bild von vorne — am Handy reicht oft ein kurzes Selfie. Du kannst auch ein vorhandenes Foto nutzen und den Ausschnitt gleich noch anpassen.",
  helpText = "Nach dem Hochladen Profil speichern, damit andere das Bild sehen.",
}: SinglesProfileImageFieldProps) {
  const inputId = useId();
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const revokeRef = useRef<(() => void) | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [exporting, setExporting] = useState(false);

  const cleanupPreview = useCallback(() => {
    revokeRef.current?.();
    revokeRef.current = null;
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageSrc(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }, [imageSrc]);

  const openCropForFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_RAW_FILE_BYTES) {
        onError?.(
          "Die Datei ist zu groß. Bitte wähle ein Bild unter etwa 45 MB.",
        );
        return;
      }

      try {
        cleanupPreview();
        const { url, revoke } = await fileToImageObjectUrl(file);
        revokeRef.current = revoke;
        setImageSrc(url);
        setCropOpen(true);
      } catch {
        onError?.(
          isHeicLike(file)
            ? "Dieses HEIC/HEIF-Bild konnte nicht geöffnet werden. Bitte versuche ein anderes Foto oder wandle es vorher in JPG um."
            : "Das Bild konnte nicht geöffnet werden.",
        );
      }
    },
    [cleanupPreview, onError],
  );

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handlePick = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) {
        return;
      }
      const looksImage = file.type.startsWith("image/") || isHeicLike(file);
      if (!looksImage) {
        onError?.("Bitte wähle eine Bilddatei.");
        return;
      }
      void openCropForFile(file);
    },
    [openCropForFile, onError],
  );

  const onDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && exporting) {
        return;
      }
      if (!open) {
        setCropOpen(false);
        cleanupPreview();
      }
    },
    [cleanupPreview, exporting],
  );

  const confirmCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) {
      return;
    }
    setExporting(true);
    const src = imageSrc;
    const area = croppedAreaPixels;
    try {
      const blob = await getCroppedProfileBlob(src, area);
      const file = profileBlobToUploadFile(blob);
      revokeRef.current?.();
      revokeRef.current = null;
      URL.revokeObjectURL(src);
      setImageSrc(null);
      setCroppedAreaPixels(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCropOpen(false);
      await onFileReady(file);
    } catch (e) {
      onError?.(
        e instanceof Error
          ? e.message
          : "Bild konnte nicht verarbeitet werden.",
      );
    } finally {
      setExporting(false);
    }
  }, [imageSrc, croppedAreaPixels, onFileReady, onError]);

  const blockDragDefaults = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">Profilbild</span>
      <div className="flex flex-wrap items-start gap-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="h-24 w-24 shrink-0 rounded-full border-2 border-border object-cover shadow-sm"
          />
        ) : (
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-dashed border-muted-foreground/35 bg-muted/40 text-muted-foreground">
            <ImageIcon className="h-10 w-10" weight="duotone" aria-hidden />
          </div>
        )}
        <label
          htmlFor={inputId}
          onDragEnter={blockDragDefaults}
          onDragOver={blockDragDefaults}
          onDrop={(e) => {
            blockDragDefaults(e);
            if (disabled || busy || exporting) {
              return;
            }
            handlePick(e.dataTransfer.files);
          }}
          className={`flex min-h-[7.5rem] min-w-[min(100%,18rem)] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-600/40 bg-teal-50/50 px-4 py-5 text-center transition hover:border-teal-700/60 hover:bg-teal-50 dark:border-teal-500/35 dark:bg-teal-950/20 dark:hover:border-teal-400/50 ${
            disabled || busy || exporting
              ? "pointer-events-none opacity-50"
              : ""
          }`}
        >
          <UploadSimple
            className="h-8 w-8 text-teal-700 dark:text-teal-400"
            weight="bold"
          />
          <span className="font-semibold text-foreground">
            Foto wählen oder hierher ziehen
          </span>
          <span className="max-w-sm text-xs leading-5 text-muted-foreground">
            {description}
          </span>
          <input
            id={inputId}
            type="file"
            className="sr-only"
            accept="image/*,.heic,.heif"
            disabled={disabled || busy || exporting}
            onChange={(e) => {
              handlePick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {busy ? (
        <p className="text-xs text-muted-foreground">Bild wird hochgeladen…</p>
      ) : (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}

      <Dialog open={cropOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent className="gap-0 p-0 md:max-h-[90vh]" showCloseButton>
          <div className="border-b border-border px-4 pb-3 pt-4 pr-14 md:px-5">
            <DialogTitle>Ausschnitt wählen</DialogTitle>
            <DialogDescription className="mt-1">
              Verschiebe und zoome das Bild so, dass dein Gesicht gut erkennbar
              im Kreis liegt — damit andere dich vor Ort wiedererkennen.
            </DialogDescription>
          </div>
          {imageSrc ? (
            <div className="relative h-[min(52vh,420px)] w-full bg-black md:h-[min(56vh,480px)]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          ) : null}
          <div className="grid gap-3 border-t border-border px-4 py-4 md:px-5">
            <label className="grid gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
                onClick={() => onDialogOpenChange(false)}
                disabled={exporting}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                onClick={() => void confirmCrop()}
                disabled={!croppedAreaPixels || exporting}
              >
                {exporting ? "Wird vorbereitet…" : "Übernehmen"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
