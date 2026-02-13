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
import {
  Zap,
  ExternalLink,
  Link2,
  BarChart3,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut, useSession } from "@/lib/auth-client";

const navItems = [
  {
    label: "Mis Enlaces",
    href: "/dashboard",
    icon: Link2,
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

  return (
    <header className="w-full border-b border-gray-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + App Name */}
          <div className="flex items-center gap-3">
            <Image
              src="https://storage.googleapis.com/media-topfinanzas-com/images/topnetworks-positivo-sinfondo.webp"
              alt="TopNetworks Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-cyan" />
              <h1 className="text-xl font-bold text-brand-gradient tracking-tight">
                RouteGenius
              </h1>
            </div>
          </div>

          {/* Center: Navigation Items */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-brand-blue border border-blue-100"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Version badge + User + Actions */}
          <div className="flex items-center gap-3">
            <span className="hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-700 border border-lime-200">
              Fase 2
            </span>

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/settings"
                  className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-brand-blue transition-colors rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-blue-50/60"
                  title="Configuración de Perfil"
                >
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "Usuario"}
                      width={28}
                      height={28}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">
                      {userInitial}
                    </div>
                  )}
                  <span className="max-w-37.5 truncate">
                    {user.email || user.name}
                  </span>
                </Link>

                {/* Mobile user avatar */}
                <Link
                  href="/dashboard/settings"
                  className="md:hidden"
                  title="Configuración de Perfil"
                >
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "Usuario"}
                      width={28}
                      height={28}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            )}

            <motion.a
              href="https://topnetworks.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-blue transition-colors"
              whileHover={{ scale: 1.2, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </motion.a>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="sm:hidden flex items-center gap-1 pb-2 -mt-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-brand-blue border border-blue-100"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
