"use client";

/**
 * RouteGenius — Configuración de Perfil
 *
 * User profile management page.
 * Allows updating display name and profile picture (avatar).
 */

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  User,
  Camera,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Shield,
  Calendar,
} from "lucide-react";
import { useSession, authClient } from "@/lib/auth-client";

type FeedbackState = {
  type: "success" | "error" | "idle";
  message: string;
};

export default function SettingsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const user = session?.user;

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<FeedbackState>({
    type: "idle",
    message: "",
  });
  const [avatarFeedback, setAvatarFeedback] = useState<FeedbackState>({
    type: "idle",
    message: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with session data
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || "");
      setAvatarPreview(user.image || null);
    }
  }, [user]);

  // Clear feedback after 4 seconds
  const clearFeedbackAfterDelay = useCallback(
    (setter: React.Dispatch<React.SetStateAction<FeedbackState>>) => {
      setTimeout(() => setter({ type: "idle", message: "" }), 4000);
    },
    [],
  );

  /** Handle display name update */
  const handleSaveName = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setNameFeedback({
        type: "error",
        message: "El nombre no puede estar vacío.",
      });
      clearFeedbackAfterDelay(setNameFeedback);
      return;
    }

    if (trimmedName === user?.name) {
      setNameFeedback({
        type: "success",
        message: "Sin cambios.",
      });
      clearFeedbackAfterDelay(setNameFeedback);
      return;
    }

    setIsSavingName(true);
    try {
      await authClient.updateUser({
        name: trimmedName,
      });
      setNameFeedback({
        type: "success",
        message: "Nombre actualizado correctamente.",
      });
    } catch {
      setNameFeedback({
        type: "error",
        message: "Error al actualizar el nombre. Intente de nuevo.",
      });
    } finally {
      setIsSavingName(false);
      clearFeedbackAfterDelay(setNameFeedback);
    }
  };

  /** Handle avatar file selection */
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setAvatarFeedback({
        type: "error",
        message: "Use un archivo JPEG, PNG, WebP o GIF.",
      });
      clearFeedbackAfterDelay(setAvatarFeedback);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarFeedback({
        type: "error",
        message: "El archivo es demasiado grande (máx. 5 MB).",
      });
      clearFeedbackAfterDelay(setAvatarFeedback);
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setIsUploadingAvatar(true);

    try {
      // 1. Upload to GCS via API
      const formData = new FormData();
      formData.append("avatar", file);

      const uploadRes = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Error al subir la imagen.");
      }

      // 2. Update Better Auth user profile with new image URL
      await authClient.updateUser({
        image: uploadData.url,
      });

      setAvatarPreview(uploadData.url);
      setAvatarFeedback({
        type: "success",
        message: "Foto de perfil actualizada.",
      });
    } catch (err) {
      // Revert preview on error
      setAvatarPreview(user?.image || null);
      setAvatarFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al actualizar la foto de perfil.",
      });
    } finally {
      setIsUploadingAvatar(false);
      clearFeedbackAfterDelay(setAvatarFeedback);
      // Reset the file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  if (sessionLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
          <span className="ml-2 text-sm text-gray-500">Cargando perfil…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-20 text-gray-500">
          <User className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>Debe iniciar sesión para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Configuración de Perfil
        </h2>
        <p className="text-sm text-gray-500">
          Administre su información personal y foto de perfil.
        </p>
      </div>

      {/* Avatar Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Camera className="w-4.5 h-4.5 text-brand-cyan" />
          Foto de Perfil
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar preview */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-white shadow-lg ring-2 ring-gray-100">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt={user.name || "Avatar"}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-brand-blue to-brand-cyan flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {userInitial}
                  </span>
                </div>
              )}
            </div>

            {/* Upload overlay */}
            {isUploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}

            {/* Hover overlay for click */}
            {!isUploadingAvatar && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Cambiar foto de perfil"
              >
                <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Upload controls */}
          <div className="flex-1 text-center sm:text-left">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
              aria-label="Seleccionar foto de perfil"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo…
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Cambiar Foto
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 mt-2">
              JPEG, PNG, WebP o GIF. Máximo 5 MB.
            </p>

            {/* Avatar Feedback */}
            {avatarFeedback.type !== "idle" && (
              <div
                className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                  avatarFeedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {avatarFeedback.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {avatarFeedback.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Display Name Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <User className="w-4.5 h-4.5 text-brand-blue" />
          Información Personal
        </h3>

        <div className="space-y-5">
          {/* Display Name Field */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-600 mb-1.5"
            >
              Nombre para Mostrar
            </label>
            <div className="flex gap-3">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                }}
                placeholder="Tu nombre"
                maxLength={100}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-shadow"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isSavingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar
              </button>
            </div>

            {/* Name Feedback */}
            {nameFeedback.type !== "idle" && (
              <div
                className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                  nameFeedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {nameFeedback.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {nameFeedback.message}
              </div>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Correo Electrónico
            </label>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-500">
              <Mail className="w-4 h-4 text-gray-400" />
              {user.email}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              El correo electrónico se gestiona a través de Google OAuth y no
              puede modificarse aquí.
            </p>
          </div>
        </div>
      </div>

      {/* Account Info Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8">
        <h3 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Shield className="w-4.5 h-4.5 text-brand-lime" />
          Información de la Cuenta
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-brand-blue" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Proveedor</p>
              <p className="text-sm text-gray-800">Google OAuth</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-brand-cyan" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Miembro desde
              </p>
              <p className="text-sm text-gray-800">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
