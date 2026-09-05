"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Fixed bottom tab bar for the mobile fisherman experience.
 * Rendered only below the `lg` breakpoint; desktop keeps the sidebar.
 */
export function MobileBottomNav({ items }) {
  const pathname = usePathname();
  // Six sections still have to fit a narrow phone, so the pill and the label
  // tighten up rather than the row overflowing.
  const dense = items.length > 5;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center px-0.5 py-2 transition-colors ${
                  dense ? "gap-0.5" : "gap-1"
                } ${isActive ? "text-zinc-950" : "text-zinc-400 active:text-zinc-700"}`}
              >
                <span
                  className={`flex items-center justify-center rounded-full transition-colors ${
                    dense ? "h-6 w-9" : "h-7 w-12"
                  } ${isActive ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={`w-full truncate px-0.5 text-center leading-none tracking-tight ${
                    dense ? "text-[9px]" : "text-[10px]"
                  } ${isActive ? "font-semibold" : "font-medium"}`}
                >
                  {item.shortLabel || item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
