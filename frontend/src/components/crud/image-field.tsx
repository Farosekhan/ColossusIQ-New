"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { CAMPUS_IMAGES, mediaUrl } from "@/lib/media";
import { acceptAttr, validateUpload } from "@/lib/security/upload";
import { Fi } from "@/components/ui/icon";
import { Button, Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1)); // strip "data:…;base64,"
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Image picker: upload a verified PNG/JPEG/WebP (≤ 2 MB) or choose a bundled campus illustration. */
export function ImageField({
  id,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (ref: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const src = mediaUrl(value);

  const upload = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const check = await validateUpload(file, "image");
    if (!check.ok) return setError(check.reason);
    setBusy(true);
    try {
      const data = await toBase64(file);
      const res = await apiFetch("/api/v1/media", z.object({ id: z.string() }), { method: "POST", body: { contentType: file.type, data } });
      onChange(res.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "bg-notebook relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed",
          invalid ? "border-rose" : "border-line",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) void upload(e.dataTransfer.files[0]);
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Selected image preview" className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-sm text-ink-3">
            <Fi name="picture" className="mb-2 text-3xl text-brand" />
            <p>Drop an image here, upload one, or pick from the library</p>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <Spinner className="size-6 text-brand" />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button id={id} size="sm" onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
          <Fi name="upload" /> Upload image
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowLibrary((s) => !s)} disabled={disabled} aria-expanded={showLibrary}>
          <Fi name="apps" /> Campus library
        </Button>
        {value ? (
          <Button size="sm" variant="ghost" onClick={() => onChange("")} disabled={disabled}>
            <Fi name="cross-small" /> Remove
          </Button>
        ) : null}
        <input ref={inputRef} type="file" accept={acceptAttr("image")} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void upload(f);
        }} />
      </div>
      {showLibrary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="listbox" aria-label="Campus image library">
          {CAMPUS_IMAGES.map((img) => (
            <button
              key={img.ref}
              type="button"
              role="option"
              aria-selected={value === img.ref}
              onClick={() => {
                onChange(img.ref);
                setShowLibrary(false);
              }}
              className={cn("overflow-hidden rounded-xl border-2 text-left", value === img.ref ? "border-brand" : "border-transparent hover:border-brand/40")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.ref} alt="" className="aspect-[16/10] w-full object-cover" />
              <span className="block bg-surface px-2 py-1 text-[11px] text-ink-2">{img.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-xs text-rose" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-ink-3">PNG, JPEG or WebP, up to 2 MB. Files are checked before and after upload.</p>
      )}
    </div>
  );
}
