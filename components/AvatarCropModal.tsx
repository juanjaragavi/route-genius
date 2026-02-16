"use client";

/**
 * RouteGenius — Avatar Crop Modal
 *
 * Client-side image cropper that enforces a strict 1:1 aspect ratio
 * before uploading the user's profile picture. This guarantees
 * consistent circular rendering via CSS `border-radius: 50%`.
 *
 * Uses react-easy-crop for the interactive crop area and a
 * hidden <canvas> to produce the final square image as a Blob.
 */

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, Check, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface AvatarCropModalProps {
  /** Object URL of the image to crop */
  imageSrc: string;
  /** Called with the cropped file when the user confirms */
  onCropComplete: (croppedFile: File) => void;
  /** Called when the user cancels the crop */
  onCancel: () => void;
}

/**
 * Use an off-screen canvas to extract the cropped region and
 * return it as a JPEG Blob (quality 0.92, keeps file size small).
 */
async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const SIZE = 512; // Output 512×512px, plenty for a profile picture
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    SIZE,
    SIZE,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export default function AvatarCropModal({
  imageSrc,
  onCropComplete,
  onCancel,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropAreaChange = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onCropComplete(file);
    } catch (err) {
      console.error("[AvatarCropModal] Crop failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            Recortar Foto de Perfil
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative w-full aspect-square bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-4">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-brand-blue h-1.5"
              aria-label="Zoom"
            />
            <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
          </div>

          {/* Rotation button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              aria-label="Rotar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotar
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isProcessing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
