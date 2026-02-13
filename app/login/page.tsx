"use client";

/**
 * RouteGenius — Login Page
 *
 * Full-page landing/login screen with Google OAuth.
 * Only @topnetworks.co and @topfinanzas.com users are allowed.
 */

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Image from "next/image";
import { Zap } from "lucide-react";
import { signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const paramError = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(paramError);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      if (result?.error) {
        setError(
          result.error.message ||
            "Error al iniciar sesión. Verifica la configuración del servidor.",
        );
        setLoading(false);
      }
      // If successful, Better Auth will redirect — no need to setLoading(false)
    } catch (err) {
      console.error("[RouteGenius] Google sign-in error:", err);
      setError(
        "No se pudo conectar con el servidor de autenticación. Revisa la consola del servidor.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-8 space-y-8">
          {/* TopNetworks Logo */}
          <div className="flex justify-center">
            <Image
              src="https://storage.googleapis.com/media-topfinanzas-com/images/topnetworks-positivo-sinfondo.webp"
              alt="TopNetworks Logo"
              width={180}
              height={48}
              style={{ width: "auto", height: "48px" }}
              priority
            />
          </div>

          {/* App Branding */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-7 h-7 text-brand-cyan" />
              <h1 className="text-3xl font-bold text-brand-gradient tracking-tight">
                RouteGenius
              </h1>
            </div>
            <p className="text-sm font-medium text-gray-500">
              Rotación Probabilística de Tráfico
            </p>
          </div>

          {/* Subtitle */}
          <p className="text-center text-sm text-gray-500">
            Inicia sesión con tu cuenta corporativa de Google para continuar.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {decodeURIComponent(error)}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-brand-blue text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg
                className="animate-spin w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <GoogleIcon />
            )}
            {loading ? "Conectando..." : "Iniciar Sesión con Google"}
          </button>

          {/* Domain Notice */}
          <p className="text-center text-xs text-gray-400">
            Acceso restringido a usuarios de TopNetworks, Inc.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} TopNetworks, Inc. Todos los derechos
          reservados.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen page-bg flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Cargando...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
