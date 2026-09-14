"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CloudSun,
  Database,
  Fish,
  House,
  LifeBuoy,
  Map,
  Mic,
  Navigation,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { marineLocations } from "@/lib/marine-data";
import { AiDrawer } from "@/components/ai-drawer";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useT } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/fisherman/language-switch";
import { AlertsBell } from "@/components/alerts-bell";

/*
 * `roles` decides who may open a section; `nav` decides whose menu shows it.
 * Fishermen reach Weather and Alerts from their home screen tiles, so those
 * stay open to them without crowding a five-button phone menu.
 */
const navItems = [
  { href: "/app", label: "Home", i18nKey: "nav.home", icon: House, roles: ["fisherman", "researcher", "operator"], priority: { fisherman: 1, researcher: 1, operator: 1 } },
  { href: "/app/fishing-zones", label: "Zones", i18nKey: "nav.zones", icon: Fish, roles: ["fisherman"], priority: { fisherman: 2 } },
  { href: "/app/risk", label: "Safety", i18nKey: "nav.safety", icon: ShieldCheck, roles: ["fisherman"], priority: { fisherman: 3 } },
  { href: "/app/vessel", label: "Trip", i18nKey: "nav.trip", icon: Navigation, roles: ["fisherman"], priority: { fisherman: 4 } },
  { href: "/app/lost-fisherman", label: "Rescue", icon: LifeBuoy, roles: ["operator"], priority: { operator: 2 } },
  { href: "/app/alerts", label: "Alerts", icon: TriangleAlert, roles: ["operator", "fisherman"], nav: ["operator"], priority: { operator: 3 } },
  { href: "/app/research", label: "Data", icon: Database, roles: ["researcher"], priority: { researcher: 2 } },
  { href: "/app/map", label: "Map", icon: Map, roles: ["researcher", "operator"], priority: { researcher: 3, operator: 4 } },
  { href: "/app/weather", label: "Weather", icon: CloudSun, roles: ["researcher", "operator", "fisherman"], nav: ["researcher", "operator"], priority: { researcher: 4, operator: 5 } },
  { href: "/app/ai-agent", label: "Ask", i18nKey: "nav.ask", icon: Mic, roles: ["fisherman", "researcher", "operator"], priority: { fisherman: 5, researcher: 5, operator: 6 } },
];

const headerSelect =
  "h-9 min-w-0 max-w-[42vw] cursor-pointer truncate rounded-[2px] border border-[#3a393e] bg-[#151417] px-2 text-xs font-semibold text-white outline-none hover:border-white focus:border-white sm:max-w-none sm:px-3";

function isActiveHref(pathname, href) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, location, setLocationId } = useMarine();
  const { t } = useT();

  const sortedNav = React.useMemo(() => {
    const items = navItems
      .filter((item) => (item.nav || item.roles).includes(role))
      .sort((a, b) => (a.priority[role] ?? 99) - (b.priority[role] ?? 99));
    // Only the fisherman console is translated.
    if (role !== "fisherman") return items;
    return items.map((item) => (item.i18nKey ? { ...item, label: t(item.i18nKey) } : item));
  }, [role, t]);

  const isAgentPage = pathname === "/app/ai-agent";

  // Keep a role out of sections it may not open.
  React.useEffect(() => {
    if (pathname === "/app") return;
    const current = navItems.find(
      (item) => item.href !== "/app" && pathname.startsWith(item.href)
    );
    if (current && !current.roles.includes(role)) {
      router.replace("/app");
    }
  }, [pathname, role, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        {role === "fisherman" && <LanguageSwitch />}

        <label className="sr-only" htmlFor="location-select">
          Location
        </label>
        <select
          id="location-select"
          value={location.id}
          onChange={(event) => setLocationId(event.target.value)}
          className={headerSelect}
        >
          {marineLocations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>

        {/* Warnings live here now, for every role: official advisories for this
            coast, plus the operator console's own notifications. It used to be
            an operator-only text button, and a fisherman had to scroll the
            home screen to find out a gale warning was in force. */}
        <AlertsBell />
      </SiteHeader>

      {/* Desktop: icon + word across the top */}
      <nav aria-label="Service" className="sw-dark hidden border-t border-[#2a2a2e] lg:block">
        <ul className="flex w-full gap-8 px-10">
          {sortedNav.map((item) => {
            const Icon = item.icon;
            const active = isActiveHref(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`sw-press -mb-px flex items-center gap-2 border-b-2 py-4 text-[15px] font-semibold tracking-tight ${
                    active
                      ? "border-white text-white"
                      : "border-transparent text-[#99968e] hover:text-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <main
        className={`w-full flex-1 px-4 sm:px-6 lg:px-10 ${
          isAgentPage ? "flex min-h-0 flex-col py-4" : "py-6 lg:py-10"
        } pb-28 lg:pb-12`}
      >
        {children}
      </main>

      {/* Phone: big icons along the bottom, where a thumb reaches */}
      <nav
        aria-label="Primary"
        className="sw-dark fixed inset-x-0 bottom-0 z-40 border-t border-[#2a2a2e] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex w-full">
          {sortedNav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActiveHref(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`sw-press flex min-h-[68px] flex-col items-center justify-center gap-1.5 border-t-2 px-1 py-2 ${
                    active
                      ? "border-white font-bold text-white"
                      : "border-transparent font-medium text-[#99968e]"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  <span className="w-full truncate text-center text-[13px] leading-none tracking-tight">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!isAgentPage && (
        <div className="hidden lg:block">
          <SiteFooter />
        </div>
      )}

      <AiDrawer />
    </div>
  );
}
