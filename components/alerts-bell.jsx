"use client";

/**
 * The warnings bell in the header.
 *
 * Warnings were only reachable by scrolling to a card most of the way down the
 * home screen, or — for operators — behind a text button that showed nothing
 * but a count. This puts every active advisory one tap away from any page:
 * official INCOIS / IMD / Coast Guard warnings for this coast, and for an
 * operator the console's own notifications (a fisherman's SOS, a departure)
 * in the same list.
 *
 * Opening it takes over the whole screen rather than dropping a small panel
 * out of the header. A warning is the one thing on this app worth reading
 * without competing with anything else behind it, the text is long enough that
 * a dropdown truncated it, and the header's control row scrolls sideways,
 * which clipped an absolutely positioned child anyway. A back button returns
 * you to whatever page you were on; Escape does the same.
 *
 * The bell shows what it was told. When the advisory feed is unreachable and
 * the answer is the bundled sample set, it says so on the panel rather than
 * letting a demo warning read as an official one.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Bell, LifeBuoy, TriangleAlert } from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { fetchOceanAlerts, ignoreAbort } from "@/lib/fisherman-api";
import { useT } from "@/lib/i18n";

/* Only the fisherman console is translated; the other two work in English. */
const ENGLISH = {
  "a.title": "Warnings & hazards",
  "a.activeInSector": "{count} active in your area",
  "a.normal": "Coastal waters are within normal safety limits right now.",
  "common.back": "Back",
  "home.viewAll": "View all",
  "common.loading": "Loading…",
};

function severityColour(severity) {
  const value = String(severity || "").toLowerCase();
  if (value === "critical" || value === "severe") return "#d0182a";
  if (value === "warning" || value === "advisory" || value === "moderate") return "#c26a00";
  return "#6d6c70";
}

export function AlertsBell() {
  const { role, location, operatorNotifications = [] } = useMarine();
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  const [alerts, setAlerts] = React.useState([]);
  const [source, setSource] = React.useState(null);
  const coastKey = `${location.lat},${location.lon}`;
  const [loadedKey, setLoadedKey] = React.useState(null);
  const loading = loadedKey !== coastKey;
  const holder = React.useRef(null);

  const label = React.useCallback(
    (key, vars) => {
      if (role === "fisherman") return t(key, vars);
      let text = ENGLISH[key] || key;
      for (const [name, value] of Object.entries(vars || {})) {
        text = text.replace(`{${name}}`, value);
      }
      return text;
    },
    [role, t]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    fetchOceanAlerts(location.lat, location.lon, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setAlerts(response.data || []);
        setSource(response.source);
        setLoadedKey(coastKey);
      })
      .catch(ignoreAbort);
    return () => controller.abort();
  }, [location.lat, location.lon, coastKey]);

  React.useEffect(() => {
    if (!open) return;
    const escape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", escape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const notifications = role === "operator" ? operatorNotifications : [];
  const count = alerts.length + notifications.length;
  // One severe warning should look different from three advisories.
  const severe = alerts.some((alert) =>
    ["critical", "severe"].includes(String(alert.severity || "").toLowerCase())
  );

  return (
    <div ref={holder} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label("a.title")}${count ? ` (${count})` : ""}`}
        className={`sw-press relative flex h-9 items-center gap-1.5 rounded-[2px] border px-2 text-xs font-semibold text-white ${
          open ? "border-white bg-[#151417]" : "border-[#3a393e] hover:border-white"
        }`}
      >
        <Bell className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        {count > 0 && (
          <span
            className="sw-num inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
            style={{ backgroundColor: severe ? "#d0182a" : "#c26a00" }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label("a.title")}
          /* Above the phone's bottom tab bar (z-40) as well as the header. */
          className="fixed inset-0 z-[60] flex flex-col bg-[#f4f2ec]"
        >
          <div className="sw-dark flex items-center gap-3 border-b border-[#2a2a2e] px-4 py-3 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="sw-press flex h-10 items-center gap-2 rounded-[2px] border border-[#3a393e] px-3 text-sm font-semibold text-white hover:border-white"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {label("common.back")}
            </button>
            <span className="min-w-0 flex-1">
              <span className="sw-label block truncate text-[#99968e]">
                {label("a.title")}
              </span>
              <span className="sw-num block truncate text-sm font-semibold text-white">
                {loading ? label("common.loading") : label("a.activeInSector", { count })}
              </span>
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
              {!loading && source === "demo" && (
                <p className="mb-4 border-l-4 border-[#c26a00] bg-[#fdf6e7] px-4 py-3 text-sm text-[#8a5a00]">
                  Sample warnings — the official advisory feed could not be reached.
                </p>
              )}

              {!loading && count === 0 && (
                <p className="py-10 text-center text-base text-[#6d6c70]">
                  {label("a.normal")}
                </p>
              )}

              <ul className="grid gap-px bg-[#dcd9d1]">
                {alerts.map((alert) => (
                  <li key={alert.id} className="bg-white p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="sw-label min-w-0 truncate">{alert.source}</span>
                      <span
                        className="shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                        style={{
                          color: severityColour(alert.severity),
                          borderColor: severityColour(alert.severity),
                        }}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold leading-tight tracking-[-0.02em] sm:text-xl">
                      {alert.title}
                    </p>
                    {alert.summary && (
                      <p className="mt-1.5 text-sm leading-snug text-[#3a393e]">{alert.summary}</p>
                    )}
                    {alert.operationalAction && (
                      <p className="mt-2 border-t border-[#dcd9d1] pt-2 text-sm leading-snug text-[#6d6c70]">
                        {alert.operationalAction}
                      </p>
                    )}
                  </li>
                ))}

                {notifications.map((notif) => (
                  <li key={notif.id} className="bg-white p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      {notif.type === "lost_fisherman_sos" ? (
                        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-[#d0182a]" strokeWidth={1.75} />
                      ) : (
                        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#c26a00]" strokeWidth={1.75} />
                      )}
                      <span className="min-w-0">
                        <span className="block text-lg font-bold leading-tight tracking-[-0.02em]">
                          {notif.title}
                        </span>
                        <span className="sw-label mt-1 block">{notif.timestamp}</span>
                        {notif.type === "lost_fisherman_sos" && (
                          <Link
                            href="/app/lost-fisherman"
                            onClick={() => setOpen(false)}
                            className="sw-link mt-2 inline-block text-sm font-semibold"
                          >
                            Open search and rescue
                          </Link>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                href="/app/alerts"
                onClick={() => setOpen(false)}
                className="sw-press mt-5 flex items-center justify-between gap-2 border border-[#0b0b0c] bg-white px-4 py-4 text-base font-semibold hover:bg-[#0b0b0c] hover:text-white"
              >
                {label("home.viewAll")}
                <TriangleAlert className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
