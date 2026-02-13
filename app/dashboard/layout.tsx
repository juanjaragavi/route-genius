/**
 * RouteGenius — Dashboard Layout
 *
 * Authenticated layout wrapper for all /dashboard/* pages.
 * Renders the navigation and wraps children in content area.
 */

import DashboardNav from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen page-bg">
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
        {children}
      </main>
      <footer className="border-t border-gray-200/40 bg-white/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} TopNetworks, Inc. Todos los derechos
            reservados.
          </p>
          <p className="text-xs text-gray-300">RouteGenius v2.0 — Fase 2</p>
        </div>
      </footer>
    </div>
  );
}
