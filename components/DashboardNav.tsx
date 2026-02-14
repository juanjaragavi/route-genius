"use client";

/**
 * RouteGenius — Dashboard Navigation
 *
 * Top navigation bar for authenticated dashboard pages.
 * Shows navigation items, user info, and sign-out button.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Zap,
  BarChart3,
  LogOut,
  FolderOpen,
  Search,
  Archive,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

const navItems = [
  {
    label: "Proyectos",
    href: "/dashboard",
    icon: FolderOpen,
    exact: true,
  },
  {
    label: "Buscar",
    href: "/dashboard/search",
    icon: Search,
  },
  {
    label: "Archivo",
    href: "/dashboard/archive",
    icon: Archive,
  },
  {
    label: "Analíticas",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  };

  const user = session?.user;
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  // Track which image URL failed; error auto-clears when the URL changes
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const avatarError = failedImageUrl === user?.image;

  return (
    <header className="w-full border-b border-gray-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + App Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image
              src="https://storage.googleapis.com/media-topfinanzas-com/images/topnetworks-positivo-sinfondo.webp"
              alt="TopNetworks Logo"
              width={120}
              height={32}
              className="h-6 sm:h-8 w-auto shrink-0"
              priority
            />
            <div className="h-5 sm:h-6 w-px bg-gray-300 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan shrink-0" />
              <h1 className="text-base sm:text-xl font-bold text-brand-gradient tracking-tight truncate">
                RouteGenius
              </h1>
            </div>
          </div>

          {/* Center: Navigation Items */}
          <nav className="hidden sm:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href ||
                  pathname.startsWith("/dashboard/projects")
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50/80 text-brand-blue border border-blue-100/80 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/80"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: User + Actions */}
          <div className="flex items-center gap-2">
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-700 border border-lime-200">
              Fase 2
            </span>

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-blue transition-colors rounded-lg px-2 py-1 hover:bg-blue-50/60"
                  title="Configuración de Perfil"
                >
                  {user.image && !avatarError ? (
                    <Image
                      src={user.image}
                      alt={user.name || "Usuario"}
                      width={28}
                      height={28}
                      className="rounded-full shrink-0"
                      unoptimized
                      onError={() => setFailedImageUrl(user.image ?? null)}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <span className="hidden lg:inline max-w-28 truncate text-xs">
                    {user.email || user.name}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="sm:hidden flex items-center gap-1 pb-2 -mt-1 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href ||
                pathname.startsWith("/dashboard/projects")
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-brand-blue border border-blue-100"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
