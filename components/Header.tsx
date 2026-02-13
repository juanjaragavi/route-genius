"use client";

import Image from "next/image";
import { Zap, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function Header() {
  return (
    <header className="w-full border-b border-gray-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + App Name */}
          <div className="flex items-center gap-3">
            {/* TopNetworks Logo */}
            <Image
              src="https://storage.googleapis.com/media-topfinanzas-com/images/topnetworks-positivo-sinfondo.webp"
              alt="TopNetworks Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <div className="h-6 w-px bg-gray-300" />
            {/* App Name with brand gradient */}
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-cyan" />
              <h1 className="text-xl font-bold text-brand-gradient tracking-tight">
                RouteGenius
              </h1>
            </div>
          </div>

          {/* Right: Version badge + link */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-700 border border-lime-200">
              Fase 2
            </span>
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
                delay: 0,
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </motion.a>
          </div>
        </div>
      </div>
    </header>
  );
}
