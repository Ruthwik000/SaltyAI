"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMarine, UserRole } from "@/lib/marine-context";
import { marineLocations } from "@/lib/marine-data";
import { Button } from "@/components/ui/button";
import { AiDrawer } from "@/components/ai-drawer";
import {
  LayoutDashboard,
  Map,
  Fish,
  CloudSun,
  ShieldAlert,
  AlertTriangle,
  Compass,
  Database,
  Navigation,
  LifeBuoy,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  Menu,
  X,
  Bell,
  User,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  roles: UserRole[];
  priority: {
    fisherman: number;
    researcher: number;
    operator: number;
  };
}

const navItems: NavItem[] = [
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["fisherman", "researcher", "operator"],
    priority: { fisherman: 1, researcher: 3, operator: 1 },
  },
  {
    href: "/app/map",
    label: "Marine Map",
    icon: Map,
    //badge: "Live Layers",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    roles: ["fisherman", "researcher", "operator"],
    priority: { fisherman: 6, researcher: 1, operator: 5 },
  },
  {
    href: "/app/fishing-zones",
    label: "Fishing Zones",
    icon: Fish,
    //badge: "PFZ 94%",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    roles: ["fisherman", "researcher"],
    priority: { fisherman: 2, researcher: 5, operator: 8 },
  },
  {
    href: "/app/weather",
    label: "Weather & Marine",
    icon: CloudSun,
    roles: ["researcher", "operator"],
    priority: { fisherman: 3, researcher: 4, operator: 6 },
  },
  {
    href: "/app/risk",
    label: "Risk & Safety",
    icon: ShieldAlert,
    //badge: "Low 28",
    badgeColor: "bg-zinc-100 text-zinc-800 border-zinc-200",
    roles: ["fisherman", "operator", "researcher"],
    priority: { fisherman: 4, researcher: 6, operator: 4 },
  },
  {
    href: "/app/alerts",
    label: "Alerts & Disasters",
    icon: AlertTriangle,
    //badge: "4 Active",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    roles: ["operator", "researcher"],
    priority: { fisherman: 5, researcher: 7, operator: 3 },
  },
  {
    href: "/app/research",
    label: "Research & Data",
    icon: Database,
    //badge: "ERDDAP",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    roles: ["researcher"],
    priority: { fisherman: 9, researcher: 2, operator: 7 },
  },
  {
    href: "/app/vessel",
    label: "Vessel / GPS",
    icon: Navigation,
    //badge: "Live AIS",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    roles: ["fisherman", "operator"],
    priority: { fisherman: 4, researcher: 9, operator: 2 },
  },
  {
    href: "/app/lost-fisherman",
    label: "Lost Fisherman",
    icon: LifeBuoy,
    //badge: "SAR",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    roles: ["operator", "fisherman"],
    priority: { fisherman: 8, researcher: 10, operator: 3 },
  },
  {
    href: "/app/ai-agent",
    label: "AI Marine Agent",
    icon: Sparkles,
    //badge: "Grounded",
    badgeColor: "bg-zinc-100 text-zinc-900 border-zinc-300",
    roles: ["fisherman", "researcher", "operator"],
    priority: { fisherman: 5, researcher: 3, operator: 5 },
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    role,
    setRole,
    location,
    setLocationId,
    setIsAiDrawerOpen,
    backendStatus,
    operatorNotifications,
  } = useMarine();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = React.useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = React.useState(false);

  // Filter navigation items by active role and sort based on role priority
  const sortedNav = React.useMemo(() => {
    return navItems
      .filter((item) => item.roles.includes(role))
      .sort((a, b) => a.priority[role] - b.priority[role]);
  }, [role]);

  const hasCriticalAlert = operatorNotifications.some((n) => n.severity === "critical");

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col">
      {/* Top Application Header */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-200/90 bg-white/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Left: Brand + Back to Landing */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-zinc-600 hover:text-zinc-950"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-900 bg-zinc-950 text-white shadow-xs">
                <span className="font-sans text-xs font-bold">S*</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-zinc-950">
                  salty<span className="text-zinc-400">.ai</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Role Switcher + Location Selector + Operator Notifications + Quick AI + SAR */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 shadow-xs cursor-pointer font-medium capitalize"
                title="Switch Active Operational Role"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    role === "fisherman"
                      ? "bg-emerald-500"
                      : role === "operator"
                      ? "bg-amber-500"
                      : "bg-purple-500"
                  }`}
                />
                <span className="font-semibold text-zinc-950 hidden sm:inline">
                  {role === "fisherman"
                    ? "Fisherman"
                    : role === "operator"
                    ? "Coastal Operator"
                    : "Researcher"}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-zinc-200 bg-white shadow-lg p-1 z-50 text-xs font-sans">
                  <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-100">
                    Switch Role View
                  </div>
                  {(["fisherman", "operator", "researcher"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between cursor-pointer capitalize ${
                        role === r
                          ? "bg-zinc-100 font-semibold text-zinc-950"
                          : "hover:bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      <span>
                        {r === "fisherman"
                          ? "Fisherman"
                          : r === "operator"
                          ? "Coastal Operator"
                          : "Researcher"}
                      </span>
                      {role === r && <span className="text-[10px] text-zinc-500">Active</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 shadow-xs cursor-pointer font-medium"
              >
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="font-medium truncate max-w-[90px] sm:max-w-[130px]">
                  {location.name}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {locationDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-lg border border-zinc-200 bg-white shadow-lg p-1 z-50 text-xs font-sans">
                  <div className="px-2.5 py-1.5 text-[10px] font-sans uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-100">
                    Select Coast / Port
                  </div>
                  {marineLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setLocationId(loc.id);
                        setLocationDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between cursor-pointer ${
                        location.id === loc.id
                          ? "bg-zinc-100 font-semibold text-zinc-950"
                          : "hover:bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs">{loc.name}</div>
                        <div className="text-[10px] text-zinc-400 font-sans">
                          {loc.sea} ({loc.lat.toFixed(1)}°N)
                        </div>
                      </div>
                      <span className="font-sans text-[10px] text-zinc-500">
                        {loc.sst}°C
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Operator Notifications Bell Dropdown */}
            {role === "operator" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                  className={`relative p-1.5 rounded-md border transition-colors cursor-pointer ${
                    hasCriticalAlert
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                  }`}
                  title="Coastal Operator Fleet Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {operatorNotifications.length > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${
                        hasCriticalAlert ? "bg-rose-600 animate-pulse" : "bg-zinc-900"
                      }`}
                    >
                      {operatorNotifications.length}
                    </span>
                  )}
                </button>

                {notificationsDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-80 rounded-xl border border-zinc-200 bg-white shadow-xl p-3 z-50 text-xs font-sans">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                      <span className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-zinc-700" />
                        Operator Fleet Alerts
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {operatorNotifications.length} Broadcasts
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {operatorNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-lg border text-xs ${
                            notif.severity === "critical"
                              ? "bg-rose-50 border-rose-200 text-rose-950"
                              : "bg-zinc-50 border-zinc-200 text-zinc-900"
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="truncate max-w-[170px]">{notif.title}</span>
                            <span className="text-[10px] text-zinc-400 font-sans font-normal">
                              {notif.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 mt-1 leading-snug">
                            {notif.message}
                          </p>
                          {notif.type === "lost_fisherman_sos" && (
                            <Link
                              href="/app/lost-fisherman"
                              onClick={() => setNotificationsDropdownOpen(false)}
                              className="inline-block mt-2 font-bold text-rose-700 hover:underline text-[11px]"
                            >
                              Open Search & Rescue (SAR) →
                            </Link>
                          )}
                          {notif.type === "journey_start" && (
                            <Link
                              href="/app/vessel"
                              onClick={() => setNotificationsDropdownOpen(false)}
                              className="inline-block mt-2 font-semibold text-zinc-900 hover:underline text-[11px]"
                            >
                              Track Vessel Telemetry →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick AI Assistant Trigger */}
            <Button
              size="sm"
              onClick={() => setIsAiDrawerOpen(true)}
              className="h-8 px-2.5 sm:px-3 text-xs bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
              <span className="hidden sm:inline">AI Agent</span>
            </Button>

            {/* Emergency SAR shortcut */}
            <Link
              href="/app/lost-fisherman"
              className="hidden md:inline-flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-md border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-medium transition-colors"
            >
              <LifeBuoy className="h-3.5 w-3.5 text-rose-600" />
              <span>SAR / Lost</span>
            </Link>

            {/* Back to landing link */}
            <Link
              href="/"
              className="hidden lg:flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1"
              title="Return to Product Landing Page"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Exit App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout Body with Sidebar and Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-zinc-200 bg-white shrink-0">
      

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-medium">
            {sortedNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-zinc-900 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.href === "/app/lost-fisherman" && operatorNotifications.some((n) => n.type === "lost_fisherman_sos") ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold animate-pulse">
                      SOS ACTIVE
                    </span>
                  ) : item.badge ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-sans border font-medium ${
                        isActive
                          ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                          : item.badgeColor || "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer Live Buoy Status */}
          
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-72 bg-white h-full flex flex-col border-r border-zinc-200 p-4 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                <span className="font-semibold text-sm text-zinc-950">
                  SALTY Marine Platform
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto space-y-1 text-xs">
                {sortedNav.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/app"
                      ? pathname === "/app"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                        isActive
                          ? "bg-zinc-900 text-white font-semibold"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>

                      {item.href === "/app/lost-fisherman" && operatorNotifications.some((n) => n.type === "lost_fisherman_sos") ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold animate-pulse">
                          SOS
                        </span>
                      ) : item.badge ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${item.badgeColor || "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-zinc-200">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-700 p-2 rounded-md hover:bg-zinc-100 border border-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Exit to Landing Page</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main
          className={`flex-1 ${
            pathname === "/app/ai-agent"
              ? "overflow-hidden flex flex-col p-2 sm:p-4"
              : "overflow-y-auto p-4 sm:p-6 lg:p-8"
          }`}
        >
          <div
            className={`w-full ${
              pathname === "/app/ai-agent"
                ? "max-w-4xl mx-auto flex-1 flex flex-col h-full min-h-0"
                : "mx-auto max-w-7xl"
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Global AI Assistant Drawer */}
      <AiDrawer />
    </div>
  );
}
