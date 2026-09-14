import * as React from "react";
import Image from "next/image";
import Link from "next/link";

function Brand({ size = "md" }) {
  const mark = size === "sm" ? "h-8 w-auto" : "h-10 w-auto sm:h-11";
  return (
    <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="SALTY home">
      <Image
        src="/logo-mark-white.png"
        alt=""
        width={120}
        height={100}
        priority
        className={`${mark} shrink-0 object-contain`}
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-[family-name:var(--font-serif)] text-2xl font-semibold leading-none tracking-[-0.02em] text-white">
          SALTY
        </span>
      </span>
    </Link>
  );
}

/** Dark bar: logo, wordmark and whatever controls the page passes. Single row on all screens. */
export function SiteHeader({ children }) {
  return (
    <header className="sw-dark border-b border-[#2a2a2e]">
      <div className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 sm:gap-x-6 sm:px-6 lg:px-10">
        <Brand />
        {children && (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-none sm:gap-3 sm:overflow-visible [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="sw-dark mt-auto">
      <div className="grid w-full gap-6 px-4 py-10 sm:grid-cols-12 sm:px-6 lg:px-10">
        <div className="sm:col-span-4">
          <Brand size="sm" />
        </div>
        <div className="sm:col-span-5">
          <span className="sw-label">Data</span>
          <p className="mt-2 text-sm text-[#dcd9d1]">INCOIS · Open-Meteo · NOAA CoastWatch</p>
        </div>
        <div className="sm:col-span-3 sm:text-right">
          <span className="sw-label">Emergency</span>
          <p className="mt-2 text-sm text-[#dcd9d1]">Coast Guard 1554</p>
        </div>
      </div>
    </footer>
  );
}
