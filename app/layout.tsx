import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Suspense } from "react";
import UtmPersister from "@/components/analytics/UtmPersister";
import UtmLinkInjector from "@/components/analytics/UtmLinkInjector";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RouteGenius — Rotación Probabilística de Tráfico | TopNetworks",
  description:
    "Distribuya tráfico entre múltiples URLs de destino con porcentajes de peso configurables. Desarrollado por TopNetworks, Inc.",
  icons: {
    icon: "https://storage.googleapis.com/media-topfinanzas-com/favicon.png",
    apple: "https://storage.googleapis.com/media-topfinanzas-com/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${poppins.variable} font-sans antialiased`}>
        {/* UTM persistence: detect params in URL → sessionStorage → inject into links */}
        <Suspense fallback={null}>
          <UtmPersister />
        </Suspense>
        <UtmLinkInjector />
        {children}
      </body>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
