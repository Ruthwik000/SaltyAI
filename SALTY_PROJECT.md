# SALTY — Agentic Marine Intelligence & Safety Platform

**Smart India Hackathon · PS ID 26176 — "ORCA: Marine EcOsystem Reasoning with Collaborative Agents"**
Team **AlgoPirates** · Frontend by Rahul · Backend by teammate

> One coast, three people who need different things from it: the fisherman going out
> tomorrow, the researcher watching the water change, and the operator ashore who has to
> find someone when a boat stops answering. SALTY is the layer that gives each of them
> the same ocean, spoken in their own terms.

---

## Table of contents

1. [What SALTY is](#1-what-salty-is)
2. [Tech stack](#2-tech-stack)
3. [Repository map](#3-repository-map)
4. [Architecture and data flow](#4-architecture-and-data-flow)
5. [Data sources — verified, with exact endpoints](#5-data-sources--verified-with-exact-endpoints)
6. [The three consoles](#6-the-three-consoles)
   - [6.1 Fisherman](#61-fisherman-console)
   - [6.2 Researcher](#62-researcher-console)
   - [6.3 Coastal Operator](#63-coastal-operator-console)
7. [End-to-end flows](#7-end-to-end-flows)
8. [Multi-language & voice (fisherman side)](#8-multi-language--voice-fisherman-side)
9. [The map engine](#9-the-map-engine)
10. [Computation reference — every formula in the app](#10-computation-reference--every-formula-in-the-app)
11. [Backend contract](#11-backend-contract)
12. [State, storage and persistence](#12-state-storage-and-persistence)
13. [Honesty rules — the non-negotiables](#13-honesty-rules--the-non-negotiables)
14. [Known issues, deliberate gaps, and what is next](#14-known-issues-deliberate-gaps-and-what-is-next)
15. [Running it](#15-running-it)
16. [Build history — what was changed and why](#16-build-history--what-was-changed-and-why)
17. [The TypeScript → JavaScript conversion](#17-the-typescript--javascript-conversion)

---

## 1. What SALTY is

SALTY is a marine intelligence and safety platform for the Indian coast. It pulls live
oceanographic forecasts from INCOIS, layers them on a chart, and turns them into three
role-shaped answers:

| Role | The question they arrive with | What SALTY gives back |
|---|---|---|
| **Fisherman** | *Is it safe, and where do I go?* | PFZ advisory circles on a map, a trip risk score with the reasoning shown, live GPS trip tracking, all of it in their own language and readable aloud |
| **Researcher** | *What is the ocean doing, and can I cite it?* | The live INCOIS ERDDAP catalogue, real griddap series and downloads, derived physics with the relations printed, and a channel to escalate a finding |
| **Coastal Operator** | *Who is out there, and where do I search?* | Fleet positions and status, hazards and cyclone circles, and a drift projection that recomputes the search datum live as you change how long someone has been adrift |

The frontend is the deliverable in this repository. The backend (chat agent, risk model,
lost-fisherman prediction, call agent) is a separate service; **every** call to it has a
labelled fallback so the whole product is demonstrable with the backend down.

---

## 2. Tech stack

### Runtime

| Layer | Choice | Version | Why |
|---|---|---|---|
| Framework | **Next.js** (App Router) | 16.3.4 | Server route handlers give us same-origin proxies for CORS-blocked government APIs without a separate backend |
| UI runtime | **React** | 19.2.8 | `useSyncExternalStore` for the localStorage-backed stores |
| Language | **JavaScript** (ES2022 + JSX) | — | Converted from TypeScript; see §17. `jsconfig.json` keeps the `@/` path alias |
| Styling | **Tailwind CSS** | v4 (`@tailwindcss/postcss`) | Utility-first; no separate CSS files |
| Maps | **MapLibre GL** | 6.7.0 | Open source, no token, raster + vector, DOM `Marker` support |
| Icons | **lucide-react** | ^1.40.0 | |
| Motion | **framer-motion** | ^13.2.0 | |
| Primitives | **@radix-ui/react-slot**, `class-variance-authority`, `clsx`, `tailwind-merge` | | The shadcn-style `components/ui/*` layer |

Package name is `ui2`. Repo: `Ruthwik000/SaltyAI`. Working copy:
`C:\Users\ruthw\OneDrive\Desktop\SaltyAI`.

### Deliberate non-dependencies

- **No charting library.** `components/research/charts.jsx` is hand-rolled SVG
  (`TimeSeriesChart`, `AnomalyChart`, `BarChart`, `ChartCard`, `ValueTable`, `StatTile`,
  `useWidth` via `ResizeObserver`). Keeps the bundle small and the palette under our control.
- **No i18n library.** `lib/i18n.jsx` is a plain dictionary + `useSyncExternalStore`.
  Shipped strings work with no signal, which matters on a boat.
- **No TTS service.** The browser's own `SpeechSynthesis` API — no network, no key.
- **No state library.** React context (`lib/marine-context.jsx`) plus four small
  `useSyncExternalStore` stores over `localStorage`.

---

## 3. Repository map

```
app/
  page.jsx                     Landing page
  login/page.jsx               Role picker + phone number (onboarding gate)
  layout.jsx                   Root layout, fonts, metadata
  app/
    layout.jsx                 RoleGate + AppShell wrapper
    page.jsx                   Dashboard (branches by role)
    fishing-zones/page.jsx     Fisherman — map-first PFZ browser
    risk/page.jsx              Fisherman — trip risk assessment
    vessel/page.jsx            Fisherman — GPS trip tracking
    research/page.jsx          Researcher — ERDDAP console
    weather/page.jsx           Weather & Marine (all roles; researcher gets extra)
    map/page.jsx               Marine Map (official / research / operations views)
    lost-fisherman/page.jsx    Operator — SAR datum console
    alerts/page.jsx            Alerts & disasters
    ai-agent/page.jsx          Marine assistant (chat)
    geofencing/page.jsx        Legacy view
  api/
    incois/wms/route.js              THREDDS WMS proxy (tiles + legends)
    incois/osf-config/route.js       Scrapes today's dataset filenames off the OSF page
    incois/frame/[...path]/route.js  Same-origin proxy for the official INCOIS page + GeoServer
    erddap/[...path]/route.js        INCOIS ERDDAP proxy (catalogue, info, griddap)

components/
  app-shell.jsx                Header, sidebar, role guard, nav model
  mobile-bottom-nav.jsx        Bottom tab bar (all roles on mobile)
  role-gate.jsx                Redirects to /login until role + phone are set
  ai-drawer.jsx                Slide-over assistant
  call-agent-launcher.jsx      Exotel voice-call trigger
  map/ocean-map.jsx            The map engine (~35 KB) — shared by every console
  fisherman/                   conditions-grid, data-badge, offline-map-card,
                               risk-result-sheet, trip-safety-view, trip-tracker-view,
                               zone-panel, zones-map-view,
                               language-switch, speak-button, speech-text
  research/                    research-console, charts, marine-science-panel,
                               agent-context-chip, report-finding-card
  operator/                    operations-map, research-alerts-card
  dashboard/                   dashboard-header, marine-metrics-grid, fisherman-widget,
                               researcher-widget, operator-widget, weather-marine-card,
                               hazard-alerts-card, ai-consult-card, geospatial-snapshot
  landing/                     Marketing page sections
  legacy/                      Preserved older views (pfz-catalog, risk-console, vessel-telemetry)
  ui/                          button, card, badge, input, dialog, tabs, accordion, separator

lib/
  i18n.jsx                     10-language dictionary, language store, speech hook
  marine-context.jsx           Role, location, notifications, active journey, AI drawer
  marine-data.js               Bundled coastal dataset (locations, PFZ zones, vessels, alerts)
  fisherman-api.js             Fisherman backend client + demo fallbacks (~20 KB)
  operations-api.js            Fleet + SAR drift client + demo fallbacks
  research-api.js              Research series client
  erddap.js                    ERDDAP catalogue, variables, point series, griddap URLs
  incois-layers.js             The 9 verified OSF WMS variables + URL builders
  api.js                       Marine agent chat, call-agent status, Exotel call
  geo.js                       distanceNM, bearingDeg, compassPoint, circleRing, formatCoord
  use-geolocation.js           Watch-position hook with permission states
  trip-store.js                Planned trips + trip history (localStorage)
  sar-store.js                 Open search cases + focused case (localStorage)
  research-alerts.js           Researcher → operator escalations (localStorage)
  dataset-bookmarks.js         Bookmarked ERDDAP datasets
  research-context.js          Dataset context handed to the AI agent
  frontend-map-data.ts, id.ts, utils.ts
```

---

## 4. Architecture and data flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  BROWSER (Next.js client components)                                │
│                                                                     │
│  AppShell ── RoleGate ── role: fisherman | researcher | operator     │
│      │                                                              │
│      ├── MarineContext (role, location, notifications, journey)     │
│      ├── i18n store    (language, fisherman console only)           │
│      └── localStorage stores (trips, SAR cases, bookmarks, alerts)  │
│                                                                     │
│  OceanMap (MapLibre GL) ── basemaps · OSF raster overlay ·          │
│                            DOM markers for zones/fleet/hazards      │
└───────────┬──────────────────────────────┬──────────────────────────┘
            │                              │
   same-origin proxies              SALTY backend (teammate)
   (Next route handlers)            http://127.0.0.1:8010
            │                              │
   ┌────────┴─────────┐          ┌─────────┴──────────┐
   │ /api/incois/wms  │          │ /api/fisherman/*   │
   │ /api/incois/     │          │ /api/operations/*  │
   │      osf-config  │          │ /api/research/*    │
   │ /api/incois/     │          │ /api/llm/chat      │
   │      frame/*     │          │ /api/call-agent/*  │
   │ /api/erddap/*    │          └────────────────────┘
   └────────┬─────────┘                    │
            │                    on failure ▼
   ┌────────┴────────────────┐    ┌────────────────────────┐
   │ incois.gov.in (THREDDS, │    │ Labelled demo fallback  │
   │ GeoServer, OSF page)    │    │ (marine-data.ts +       │
   │ erddap.incois.gov.in    │    │  on-device computation) │
   └─────────────────────────┘    └────────────────────────┘
```

### Why the proxies exist

Neither `incois.gov.in` nor `erddap.incois.gov.in` sends an
`Access-Control-Allow-Origin` header. A browser cannot call them directly. Every request
goes through a Next.js route handler on our own origin, which fetches server-side and
streams the body back. This is not a convenience — without it the map has no layers and
the research console has no catalogue.

### The `Sourced<T>` pattern

Every client function that can reach the backend returns:

```ts
interface Sourced<T> {
  data: T;
  source: "live" | "demo";
  reason?: string;   // why it fell back
}
```

`<DataBadge source={...} reason={...} />` renders that as a green **Live** pill or an amber
**Demo data** pill with the reason on hover. A demo number is never allowed to look like a
measurement.

### Circuit breaker

`lib/fisherman-api.js` and `lib/operations-api.js` share the same transport:

- `TIMEOUT_MS = 7000` per request via `AbortController`
- On a **connection-level** failure (never on an HTTP error status), `downUntil = Date.now() + 30_000`
- While `Date.now() < downUntil`, calls throw immediately instead of dialling

This is what stopped the console flooding with `ERR_CONNECTION_REFUSED` when the backend
is not running. An HTTP 500 does *not* trip the breaker — the server answered, so it is up.

---

## 5. Data sources — verified, with exact endpoints

Every one of these was read off the official page source or network traffic before it was
integrated. **Nothing here is a guessed URL.**

### 5.1 INCOIS Ocean State Forecast — THREDDS WMS

- **Discovered from:** `https://www.incois.gov.in/oceanservices/osfforecast.jsp` (page source)
- **Upstream:** `https://www.incois.gov.in/thredds/wms/osf/<dataset>.nc`
- **Our proxy:** `GET /api/incois/wms?dataset=<dir>/<file>.nc&…WMS params`
- **Allow-list:** the proxy only accepts `^(ww3|currents|winds)/[A-Za-z0-9_.-]+\.nc$` — a hard
  guard so the route cannot be used as an open proxy.

The nine verified variables (`lib/incois-layers.js`):

| Key | Dataset path | WMS layer | Style | Unit | Fisherman | Researcher |
|---|---|---|---|---|:--:|:--:|
| `wind` | `ww3/rsmc_combined_ww3_latest.nc` | `UWND:VWND-mag` | `raster/x-Occam` | m/s | ✅ | ✅ |
| `waves` | `ww3/rsmc_combined_ww3_latest.nc` | `HS` | `raster/x-Rainbow` | m | ✅ | ✅ |
| `swell` | `ww3/rsmc_combined_ww3_latest.nc` | `PHS01` | `raster/x-Rainbow` | m | ✅ | ✅ |
| `currents` | `currents/CURRENTS_NIO_latest.nc` | `U:V-mag` | `raster/x-Rainbow` | m/s | ✅ | ✅ |
| `sst` | `winds/SST_NIO_latest.nc` | `SST` | `raster/x-Rainbow` | °C | ✅ | ✅ |
| `wavePeriod` | `ww3/rsmc_combined_ww3_latest.nc` | `T02` | `raster/x-Rainbow` | s | — | ✅ |
| `swellPeriod` | `ww3/rsmc_combined_ww3_latest.nc` | `PTP01` | `raster/x-Rainbow` | s | — | ✅ |
| `mld` | `winds/MLD_NIO_latest.nc` | `MLD` | `raster/x-Rainbow` | m | — | ✅ |
| `d20` | `winds/MLD_NIO_latest.nc` | `D20` | `raster/x-Rainbow` | m | — | ✅ |

**The filename bug and its fix.** INCOIS publishes a dated file each day
(`CURRENTS_NIO_20260903.nc`). `/api/incois/osf-config` scrapes today's real names out of
the OSF page's inline JS variables (`sstnio`, `currentsFile2`, `rsmc_combined_ww3`,
`mldnio`) — but returns them **bare**, without the directory. Both THREDDS and our own
allow-list need the prefix, so `osfDatasetPath()` puts it back:

```ts
// /api/incois/osf-config reports bare filenames (CURRENTS_NIO_20260903.nc).
// The THREDDS WMS endpoint — and the dataset allow-list in /api/incois/wms —
// both need the directory prefix, so put it back.
if (discovered.includes("/")) return discovered;
const directory = osfLayers[key].path.split("/")[0];
return `${directory}/${discovered}`;
```

Before this fix every tile and legend request returned **400 Bad Request**.

### 5.2 INCOIS GeoServer — India coastline / boundary

- **Layer:** `BaseMaps-Common:gdam_410_l0_india_corrected`
- **Via:** `/api/incois/frame/geoserver/BaseMaps-Common/wms?…&SRS=EPSG:3857&BBOX={bbox-epsg-3857}`
- Rendered as a MapLibre raster source so the coast is drawn even with no external basemap.

### 5.3 INCOIS ERDDAP — the research data

- **Base:** `https://erddap.incois.gov.in/erddap`
- **Proxy:** `/api/erddap/[...path]` (15 s timeout, passes query string through)
- **Endpoints used:**
  - catalogue — `tabledap/allDatasets.json?datasetID,title,institution,summary,griddap`
  - variables — `info/<datasetID>/index.json`
  - slice/download — `griddap/<datasetID>.<format>?<var>[time][lat][lon]`

Fallback catalogue if the live one cannot be read (15 known INCOIS griddap dataset IDs,
labelled as the fallback when used):

```
AMSRE_MONTHLY_GLOBAL            ascat_daily_datasets            ascat_mnt_datasets
NOAA_AVHRR_AMSR_datasets        incois_argo_10day_McCreary      incois_argo_10d_VAM
incois_argo_mnt_McCreary        incois_argo_mnt_VAM             incois_argo_sst_weekly
incois_oceansat2_datasets       incois_quickscat_daily_datasets incois_quickscat_mnt_datasets
incois_tmi_3day_datasets        incois_valueadded_products_datasets
IRS_chlorophyll_datasets
```

### 5.4 INCOIS official pages (iframed)

- OSF forecast page — `https://www.incois.gov.in/oceanservices/osfforecast.jsp`
- PFZ / MFAS page — `https://www.incois.gov.in/DataInfo/MFASPFZ/index.html`

Served through `/api/incois/frame/[...path]`, which rewrites `<head>` to inject a `<base>`
tag and rewrites root-relative `/thredds/`, `/geoserver/`, `/json/`, `/site/`, `/portal/`,
`/assets/` URLs to stay inside the same-origin proxy. The Marine Map page crops the INCOIS
header (`86 px`) and footer (`120 px`) so only the chart shows.

### 5.5 Basemaps

- Ocean (default): a MapLibre built-in `background` layer, `#0e2a45` — **no external tiles**,
  so zones and vectors are visible even offline
- Streets: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- Satellite: `https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}`

### 5.6 Bundled dataset — `lib/marine-data.js`

Coastal locations across the Bay of Bengal, Arabian Sea and Indian Ocean, each carrying:
`lat/lon, sst, chlorophyll, windSpeed, windDirection, windDegrees, waveHeight, wavePeriod,
swellHeight, swellPeriod, currentSpeed, currentDirection, tideStatus, nextHighTide,
nextLowTide, riskScore, riskLevel, weather{condition, temp, humidity, visibility, pressure}`.

Plus PFZ zones, active vessels, and marine alerts. This is the **demo** substrate — it is
what every fallback is built from, and it is always badged.

---

## 6. The three consoles

Navigation is one array in `components/app-shell.jsx`. Each item declares which `roles` may
see it and a per-role `priority` that sets the order. A route guard effect redirects a role
away from any page its own nav does not include — so a fisherman cannot reach
`/app/lost-fisherman` by URL or by switching roles while sitting on it.

`const usesBottomNav = true` — **every** role gets the bottom tab bar on mobile.
`mobile-bottom-nav.jsx` sets `const dense = items.length > 5` and tightens the pill
(`h-6 w-9` vs `h-7 w-12`), the gap, and the label (`text-[9px]` vs `text-[10px]`) so the
operator's six tabs fit a 390 px screen.

### 6.1 Fisherman console

Five sections, mobile-first, bottom tab bar:

**`Home → Zones → Safety → Trip → Assistant`**

#### Home — `/app`
- `MarineMetricsGrid` in fisherman mode: popular market fish, market & price updates,
  nearby fishzone update (school surge), sea risk today. Chlorophyll, barometric pressure
  and thermal-front cards were **removed** from this role — a skipper does not act on them.
- `FishermanWidget` — the highest-suitability zone today: name, match %, school surge,
  distance/bearing/depth, transit hours, fuel estimate, and a *Start trip (notify operator)*
  button that raises an operator notification. Has a **🔊 speaker**.
- `WeatherMarineCard` — air & sky, surface wind, wave & swell, tide & drift, a 3-day sea
  state strip, and a best-time-to-go-out advisory.
- `HazardAlertsCard` — active IMD / Coast Guard warnings. Has a **🔊 speaker** that reads
  every warning title and its operational action.
- `AiConsultCard` — three suggested questions (translated for the fisherman) into the agent.

#### Zones — `/app/fishing-zones`
Map-first. `ZonesMapView` renders `OceanMap` full-bleed with PFZ advisory circles drawn to
their **true radius** (see §9), each labelled with a small suitability pill.

- Tap a circle → `fetchZoneDetail(zoneId)` → the bottom sheet (mobile) or side panel
  (desktop, `w-[380px]`) opens on that zone
- Detail shows: distance / bearing / depth / zone radius, species expected with abundance
  and depth range, weather & sea *at the zone's own coordinates*, gear advisory and
  validity, free-text notes, and two actions — **Check trip safety to this zone**
  (`/app/risk?zone=…`) and **Start a trip to this zone** (`/app/vessel?zone=…`)
- **🔊 speaker** reads the zone name, distance, bearing, depth and suitability
- Sheet height adapts: `h-14` collapsed → `h-[56%]` list → `h-[78%]` detail

#### Safety — `/app/risk`
Reads top-down in three steps.

1. **Where you are** — `ConditionsGrid` in 4 columns (sea temp, waves + period, wind +
   direction, swell, current + direction, visibility), a `DataBadge`, a **🔊 speaker**
   that reads the whole conditions sentence, and a "Not your coast?" port switcher.
2. **Plan your trip** — port, destination zone (with distance/bearing/depth preview),
   boat type (4 leeway classes), departure and expected-return `datetime-local` inputs,
   with a guard if return precedes departure.
3. **Result** — `RiskResultSheet` opens as a full-height sheet on mobile,
   `sm:max-w-lg sm:rounded-2xl` on desktop:
   - score `/100` in a circle, verdict + level
   - the demo warning, if the model was unreachable
   - safe departure window
   - **What drives this score** — each factor with its value and a coloured bar
   - **What to do** — recommendations
   - **Take these with you** — precautions
   - **Add to my trips** → `addPlannedTrip()`, which is what makes the trip appear on the
     Trip screen
   - **🔊 speaker** reads verdict + level + score + the first three recommendations

#### Trip — `/app/vessel`
Live GPS trip tracking on the same map engine.

- **Before a trip:** planned trips saved from a safety check (each with its risk score,
  `*`-marked if it came from the demo estimate), an ad-hoc "start a trip" form
  (destination + boat), the offline-map card, and past trips
- **During a trip:** a pulsing "trip in progress" header, `DataBadge` for whether the
  operator console actually registered it, six live stats — speed, heading, distance from
  port, distance to zone, elapsed, fix accuracy with points logged — the current
  coordinate, weather where you are (with a **🔊 speaker**), active warnings, and **End trip**
- Pings the backend every **30 s** (`PING_INTERVAL_MS`); the breadcrumb is drawn on the map
- Ending a trip writes a `TripRecord` (distance, duration, max speed, whether it was offline)
- `OfflineMapCard` is an honest scaffold: the online/offline indicator is real, the
  download button is disabled, and the card says plainly that offline tiles are not built yet

#### Assistant — `/app/ai-agent`
Chat with the marine agent. Two modes (Quick / Research). Accepts a dataset context chip
forwarded from the research console. Suggestions and placeholder are translated for the
fisherman. `CallAgentLauncher` starts an Exotel voice call to the number captured at login.

**Removed from this role:** Marine Map and Lost Fisherman.

### 6.2 Researcher console

Five sections: **`Home → Data → Map → Weather → Assistant`**

#### Home — `/app`
- `ResearcherWidget` — SST & chlorophyll front narrative, three metric tiles, the ERDDAP
  endpoint with its HTTP status, and (new) the **derived-physics panel** in `dashboard`
  variant: four stat tiles plus a Hs-vs-swell chart
- `ReportFindingCard` — escalate a finding to coastal operations

#### Data — `/app/research`
`ResearchConsole` (~33 KB) — the real workbench.

- Reads the **live** ERDDAP catalogue through the proxy; falls back to the 15 known IDs
  and says which it is using via `OriginBadge` (`erddap` / `backend` / `demo`)
- Per-dataset variable discovery from `info/<id>/index.json`
- Facets inferred from the dataset id, labelled **"from id"** so nobody mistakes an
  inference for metadata
- Bookmarking (`salty_dataset_bookmarks`), with a header button to view bookmarks
- Series resolution order: **ERDDAP → backend → demo**, badged at every step
- Charts via the hand-rolled SVG kit, each with a *Values* toggle that swaps the chart for
  a table — contrast relief and an accessibility route
- **Working griddap downloads** through `proxyGriddapUrl` (CSV / JSON / netCDF)
- **Ask AI about this data** — forwards the dataset context to the agent as a chip
- The demo notice is now a **thin amber rule** with the explanation on hover, not a
  paragraph (per your request)

#### Weather — `/app/weather`
Shared page; the researcher gets extra. Base: six metric cards, a 24-hour scrubbable
timeline with a detail strip, a 7-day extended table, and the tide table.

Researcher additions:
- Four more metric cards — **SST** (with air–sea Δ), **chlorophyll-a**, **wave period T02**
  (with computed deep-water wavelength), **visibility** (with RH)
- **`MarineSciencePanel`** — eight derived quantities and four charts (see §10)

#### Map — `/app/map`
Three views: `official` (the cropped INCOIS iframe), `research` (our MapLibre chart with all
nine OSF layers and GetFeatureInfo point inspection), `operations`.

**Removed from this role:** Risk & Safety, Vessel/GPS, Fishing Zones.

### 6.3 Coastal Operator console

Six sections: **`Home → SAR → Alerts → Map → Weather → Assistant`**

#### Home — `/app`
- `OperatorWidget` — active vessels in sector, with a critical-SOS banner and a live
  departure notification when a fisherman starts a journey
- `ResearchAlertsCard` — findings escalated by researchers, with the evidence attached

#### SAR — `/app/lost-fisherman`
The datum console.

- Inputs: incident identifier, target description, **target object type** (the IAMSAR
  leeway class), LKP latitude/longitude, elapsed drift time slider (0.5–24 h)
- **Compute probable drift** → `predictSearchZone()` → datum, net displacement and bearing,
  search radius and area, kinematic vector breakdown (wind leeway / surface current /
  tidal & Stokes), and a recommended IAMSAR pattern
- Result is saved with `saveSearchCase()` — re-running the same incident id **replaces**
  the earlier datum rather than leaving two contradictory circles on the chart
- **Show drift & search area on map** → `focusSearchCase(id)` + `router.push("/app/map")`
- The old "Datum Solved" badge was replaced with a real `<DataBadge>` — because a search
  datum is a life-safety output and must never read as confirmed when it is an estimate

#### Map — `/app/map` (operations view, the default for this role)
`OperationsMap` — side-by-side map + panel (`aside w-[360px] xl:w-[400px]` on desktop,
a `h-[72%]` bottom sheet on mobile).

- **Layer toggles:** Search areas · Fishermen · Cyclones & hazards · Fishing zones, each
  with a live count
- **Fleet:** every tracked boat as a heading-aware marker, toned by status —
  `underway` / `fishing` / `returning` (normal), `overdue` (watch), `sos` (alert)
- **Selected boat panel:** skipper, crew aboard, home port, MMSI, position, course & speed,
  distance from port, last ping, declared destination zone
- **Selected case panel:** last known position, reported adrift, target class — and the
  drift control
- **Drift projection control** (the centrepiece):
  - a slider, 0.5 → 24 h in 0.5 h steps, defaulting to the case's own elapsed time
  - changing it re-runs `predictSearchZone` (180 ms debounce, `AbortController`) and the
    **drawn path and circle update live**
  - the working is printed underneath: surface current × hours, wind leeway × hours, tidal
    stream (reversing, ≈0 net), then net set & drift in NM towards the bearing, the datum
    coordinate, search radius, area to cover, and the recommended pattern
  - **Project drift from last ping** on any selected boat starts a projection with no formal
    case open — vessel type is mapped to a leeway class automatically
  - floating card on the chart at `lg`+; inside the panel on a phone
  - a *reset to N h* link appears once you have moved off the case's own elapsed time

**Removed from this role:** Risk & Safety, Vessel/GPS.

---

## 7. End-to-end flows

### 7.1 Fisherman: zone → risk → trip

```
Fishing Zones ──tap circle──► fetchZoneDetail() ──► zone panel
      │
      └─ "Check trip safety to this zone"
             │  /app/risk?zone=<id>
             ▼
      TripSafetyView pre-selects that destination
             │
             ├─ fetchPointConditions(lat, lon)   → conditions grid + 🔊
             ├─ fetchPfzZones(lat, lon)          → destination dropdown
             │
             └─ submit ──► assessTripRisk(request)
                              │ live → SALTY risk model
                              │ demo → demoTripRisk() on this device
                              ▼
                        RiskResultSheet (score, factors, advice, 🔊)
                              │
                              └─ "Add to my trips" ──► addPlannedTrip()
                                          │  localStorage: salty_planned_trips
                                          ▼
                        Trip screen shows it under "Planned trips"
                                          │
                                          └─ "Start this trip"
                                                  │
                                                  ▼
                                          startTrip() → TripSession
                                          useGeolocation watch begins
                                          pushTripPing() every 30 s
                                                  │
                                                  ▼
                                          endTrip() → addTripRecord()
```

Every hop carries its `source`, so a demo risk score stays visibly a demo score all the
way into the planned-trip card (where it is marked with `*`).

### 7.2 Fisherman → Operator: the departure notification

```
FishermanWidget "Start trip (notify operator)"
      │  startJourney(zoneName, distanceNM)
      ▼
MarineContext.activeJourney set + operatorNotification pushed
      │
      ▼
OperatorWidget shows "Fleet departure logged: <vessel>" with an Underway badge
AppShell bell badge increments for the operator role
```

### 7.3 Researcher → Operator: escalating a finding

```
Research console / dashboard "Report a finding to coastal operations"
      │  category · severity · title · summary · evidence · region · datasets cited
      ▼
saveResearchAlert()  →  localStorage: salty_research_alerts
      │
      ▼
Operator dashboard  ResearchAlertsCard  (with the evidence and the dataset ids)
```

Verified end-to-end with Playwright — 7/7 checks passed. This is deliberately
localStorage-backed so the hand-off works today; when the backend lands, POST the same
shape and keep this as the offline queue.

### 7.4 Researcher: dataset → chart → download → agent

```
ERDDAP catalogue (live, via /api/erddap)
      │
      ├─ pick dataset ──► info/<id>/index.json ──► variables
      ├─ bookmark ──► salty_dataset_bookmarks
      │
      ├─ point series ──► fetchErddapPointSeries()
      │        │ erddap → backend → demo, badged
      │        ▼
      │   TimeSeriesChart / AnomalyChart / BarChart  (+ Values table toggle)
      │
      ├─ download ──► proxyGriddapUrl(id, var, format)  → CSV / JSON / netCDF
      │
      └─ "Ask AI about this data" ──► setAgentContext(dataset)
                    │  localStorage: salty_agent_data_context
                    ▼
             /app/ai-agent shows an AgentContextChip and sends it with the query
```

### 7.5 Operator: SOS → datum → search plan

```
Boat overdue / SOS appears in the fleet layer
      │
      ├── Option A: Lost Fisherman console
      │      LKP + target class + elapsed hours ──► predictSearchZone()
      │      saveSearchCase() ──► salty_search_cases
      │      "Show on map" ──► focusSearchCase(id) ──► /app/map
      │
      └── Option B: straight from the chart
             select the boat ──► "Project drift from last ping"
                     │  vesselType → leeway class
                     ▼
             OperationsMap drift control
                     │
                     ├─ slider 0.5…24 h  ──► predictSearchZone(elapsedHours)
                     │        (180 ms debounce, previous numbers stay on screen)
                     ▼
             drift path + search circle redraw live on the chart
             calculation card shows the working
                     │
                     └─ "Open SAR console"  or  "Stand down" (closeSearchCase)
```

---

## 8. Multi-language & voice (fisherman side)

### The problem being solved

A skipper on the Andhra or Kerala coast is not going to read an English go/no-go verdict on
a wet phone screen in bright sun. Many read slowly or not at all. So the entire fisherman
console runs in the language they pick, and the parts that change what someone *does* can
be read out loud.

### Languages

| Code | Native | English | Speech locale |
|---|---|---|---|
| `en` | English | English | `en-IN` |
| `hi` | हिन्दी | Hindi | `hi-IN` |
| `te` | తెలుగు | Telugu | `te-IN` |
| `ta` | தமிழ் | Tamil | `ta-IN` |
| `ml` | മലയാളം | Malayalam | `ml-IN` |
| `kn` | ಕನ್ನಡ | Kannada | `kn-IN` |
| `or` | ଓଡ଼ିଆ | Odia | `or-IN` |
| `bn` | বাংলা | Bengali | `bn-IN` |
| `mr` | मराठी | Marathi | `mr-IN` |
| `gu` | ગુજરાતી | Gujarati | `gu-IN` |

Every option in the picker is written **in its own script** — someone looking for Telugu is
looking for "తెలుగు", not the word "Telugu".

### How it works — `lib/i18n.jsx`

- English is the base dictionary (~190 keys). Every other language is a `Partial` of it —
  an untranslated key falls through to English rather than rendering a key name, so
  coverage can grow without ever breaking a screen.
- Key groups: `nav.*`, `shell.*`, `common.*`, `cond.*`, `zones.*`, `risk.*`, `boat.*`,
  `trip.*`, `offline.*`, `agent.*`, `dash.*`, `m.*` (market/metrics), `w.*` (weather),
  `a.*` (alerts), `ag.*` (agent card), `map.*`, `speech.*`
- `{name}` placeholder interpolation: `t("zones.near", { port: "Visakhapatnam" })`
- Store: `useSyncExternalStore` over `localStorage["salty_lang"]`, with a `storage` event
  listener so a second tab switching language moves this one too
- `setLanguage()` also sets `document.documentElement.lang`
- **Shipped strings, not runtime translation** — works with no signal

### Scope guard

Only the fisherman console is translated. The researcher and operator consoles stay in
English, which is what those users work in. The shared `OceanMap` respects this: it holds
an `ENGLISH_MAP_LABELS` table and only translates its chips when `role === "fisherman"` —
so a researcher who once picked Telugu on the other side does not get Telugu chips on their
chart.

### Voice — `components/fisherman/speak-button.jsx`

Uses the browser's `SpeechSynthesis` API. No network, no API key.

Voice selection is a three-step fallback: exact locale match → any voice for the same base
language → the device default. A phone with no Telugu voice will read the Telugu text in
its default voice, which is rough but better than silence. Rate is set to `0.95` — slightly
slower than default, because this is read over engine noise.

Speaker buttons sit where the text changes what someone does:

| Screen | What it reads |
|---|---|
| Dashboard — best zone card | zone name, distance & bearing, depth, school type, hours out |
| Dashboard — warnings card | every warning title + its operational action |
| Risk & Safety — conditions row | waves, wind + direction, sea temperature, visibility |
| Risk result sheet | verdict, level, score /100, first three recommendations |
| Zone detail panel | zone name, distance, bearing, depth, suitability % |
| Trip tracker — weather block | the conditions sentence at the current position |

The spoken sentences are built from the **same translated templates the screen uses**
(`components/fisherman/speech-text.js`), so what is spoken always matches what is printed.
Missing values are left out rather than spoken as "null".

### Data words

`conditionLabel()` and `riskLevelLabel()` translate words that arrive from the *data*
rather than the layout — weather conditions (Fair / Cloudy / Light rain / Squally /
Thunderstorm) and risk bands (the backend grades `High`; the dictionary calls that band
severe).

**What stays English:** INCOIS zone names, alert titles and bodies, species names and
market rows. Those come from the feed, and translating an official advisory in the UI would
mean inventing wording for it.

### Where the switcher lives

`components/fisherman/language-switch.jsx` — a globe button in the header, rendered only
when `role === "fisherman"`. Click-outside and Escape close it; the list is
`max-h-[70vh]` scrollable with a check on the active language.

---

## 9. The map engine

`components/map/ocean-map.jsx` (~35 KB) is shared by every console. It is the single
hardest-won file in the project.

### Props

`center`, `zoom`, `zones`, `selectedZoneId`, `onSelectZone`, `showZones`, `onToggleZones`,
`overlay`, `onOverlayChange`, `overlayKeys`, `enableValueInspection`, `hazards`, `vessel`,
`track`, `port`, `showBoundary`, `fleet`, `selectedFleetId`, `onSelectFleetUnit`,
`searchZones`, `selectedSearchZoneId`, `onSelectSearchZone`, `paths`, `onFollowVessel`,
`autoFitKey`, `autoFitBottomPadding`, `children`.

### The zero-height bug — and why the container is sized the way it is

```tsx
{/* Sized with h/w rather than inset-0: maplibre-gl.css sets
    .maplibregl-map { position: relative } and, loading after the
    Tailwind layer, it wins over `absolute` — which collapsed this box to
    zero height and hid the canvas, controls and markers inside it. */}
<div ref={container} className="h-full w-full" />
```

This was the root cause of "the map is blank and there are no MapLibre controls".
`maplibre-gl.css` loads after the Tailwind layer and its `position: relative` beat
`absolute inset-0`, collapsing the container to `height: 0`.

### Circles are DOM markers, not GeoJSON

MapLibre's web worker fails to load in the project's dev server
(`Failed to load module script: non-JavaScript MIME type "text/html"`), so GeoJSON never
gets tiled and nothing vector-based draws. Rather than fight the dev server, every zone,
fleet unit, hazard and search circle is a **DOM `Marker`** sized to its real ground radius:

```ts
const diameterPx = (zone: MapZone) => {
  const metresPerPixel =
    (156543.03392 * Math.cos((zone.lat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
  return (2 * zone.radiusNM * 1852) / metresPerPixel;
};
```

`156543.03392` is the Mercator ground resolution at the equator at zoom 0; the `cos(lat)`
term corrects for latitude; `1852` converts nautical miles to metres. The result is a
circle whose size on screen is genuinely the advisory radius, and it re-sizes on every
`zoom` event.

### Paths: why there are two layers

`line-dasharray` is **not data-driven** in MapLibre — a `case` expression on it silently
breaks the entire style. Paths are therefore split into two filtered layers:

- `paths-track` — solid, for a vessel's own breadcrumb
- `paths-drift` — dashed, for a drift projection

This was caught before shipping; it would have taken the whole map down.

### Other hardening

- StrictMode-safe teardown: the ref is released **first**, every call is wrapped in a
  `safely()` helper, and the node is cleared with `node.innerHTML = ""`
- Readiness is marked on **both** `style.load` and `load` — `load` alone never fires for a
  style with no external sources
- `ResizeObserver` → `map.resize()` so the canvas follows its container
- `autoFitKey` / `autoFitBottomPadding` fit the viewport to the data, leaving room for the
  bottom sheet
- Overlay chips scroll horizontally with the scrollbar hidden
- `enableValueInspection` issues a THREDDS `GetFeatureInfo` at the tapped point and shows
  the raw value

---

## 10. Computation reference — every formula in the app

### 10.1 Geodesy — `lib/geo.js`

- `distanceNM(a, b)` — haversine, returned in nautical miles
- `bearingDeg(a, b)` — initial great-circle bearing
- `compassPoint(deg)` — 16-point compass name
- `circleRing(centre, radiusNM, points)` — polygon ring for a circle
- `formatCoord(lat, lon)` — `17.687°N, 83.219°E`

### 10.2 Demo trip risk — `demoTripRisk()` in `lib/fisherman-api.js`

A transparent weighted sum. Every component is shown to the user in the result sheet, so
the score can be argued with.

```
seaState = clamp((waveHeight / 3.5)  × 100 × boatFactor)
wind     = clamp((windSpeed  / 35)   × 100 × boatFactor)
swell    = clamp((swellHeight / 2.5) × 100 × boatFactor)

score = seaState × 0.28
      + wind     × 0.22
      + swell    × 0.14
      + range    × 0.18
      + visibility × 0.10
      + night    × 0.08
```

Boat exposure factors (`BOAT_EXPOSURE`):

| Boat type | Label | Factor |
|---|---|---|
| `craft` | Country craft, no engine (under 24 ft) | **1.55** |
| `motorized` | Motorised FRP craft (28–34 ft) | **1.15** |
| `trawler` | Mechanised trawler (48 ft) | **0.85** |
| `longliner` | Deep-sea longliner (65 ft+) | **0.7** |

An open country craft is scored as far more exposed to the same sea than a 65 ft longliner
— which is the whole point of asking for the boat type.

### 10.3 Demo zones — `demoZonesNear()`

Sorts the bundled PFZ zones by **real haversine distance** from the fisherman's actual
position and recomputes each zone's distance and bearing from there.
`DEMO_MAX_RANGE_NM = 120`. Before this, the demo showed the same zones at the same
distances no matter where you were, which was obviously wrong on screen.

### 10.4 Drift / SAR — `demoPrediction()` in `lib/operations-api.js`

IAMSAR-style set-and-drift, integrated over the elapsed time.

```
leeway factor by target class:
  piw 0.6   craft 1.0   trawler 0.85   raft 1.4

currentKnots     = 0.65
windLeewayKnots  = 0.9 × leewayFactor
tideKnots        = 0.25            (reversing — ≈0 net displacement)

setKnots         = currentKnots + windLeewayKnots
driftDistanceNM  = setKnots × elapsedHours
driftBearingDeg  = 62

datum            = LKP stepped along the bearing by driftDistanceNM
driftPath        = 7 points (LKP + 6 steps) from LKP to datum
searchRadiusNM   = max(1.5, driftDistanceNM × 0.6)
searchAreaSqNM   = π × searchRadiusNM²

pattern = driftDistanceNM > 8
        ? "Parallel track search, 2 NM spacing"
        : "Expanding square search from the datum"
```

Stepping along a bearing (small-angle, adequate at these distances):

```ts
const dLat = (nm / 60) * Math.cos(radians);
const dLon = (nm / 60) * Math.sin(radians) / Math.cos(startLat × π/180);
```

This is a **placeholder for the real model**, and every surface that shows it says so.

### 10.5 Derived oceanography — `components/research/marine-science-panel.jsx`

Constants: `g = 9.81 m s⁻²`, `ρw = 1025 kg m⁻³`, `ρa = 1.225 kg m⁻³`,
`Cd = 1.3 × 10⁻³`, `Ω = 7.2921 × 10⁻⁵ rad s⁻¹`, `1 kt = 0.514444 m s⁻¹`.

| Quantity | Relation | Notes |
|---|---|---|
| **Wave energy flux** | `P = ρg²Hs²Te / 64π` (kW/m) | `Te ≈ 0.9 Tp` for a JONSWAP-like sea |
| **Wind stress** | `τ = ρa · Cd · U₁₀²` (N/m²) | 10 m neutral drag coefficient |
| **Coriolis parameter** | `f = 2Ω sin φ` (s⁻¹) | reported ×10⁻⁵, with inertial period `2π/f` |
| **Ekman transport** | `Me = τ / (ρw f)` (m²/s) | per metre of coast; positive = offshore = upwelling favourable, assuming alongshore wind |
| **Deep-water wavelength** | `L = gT² / 2π` (m) | |
| **Wave steepness** | `Hs / L` | breaking near 0.14 |
| **Air–sea ΔT** | `SST − air temp` (°C) | sea warmer ⇒ unstable, fluxes upward |
| **Swell energy share** | `Pswell / (Pwave + Pswell)` (%) | |
| **Beaufort force** | knots against the standard thresholds `[1,3,6,10,16,21,27,33,40,47,55,63]` | |
| **Douglas sea state** | Hs bands: <0.1 calm · <0.5 smooth · <1.25 slight · <2.5 moderate · <4 rough · <6 very rough · <9 high · else very high | |

Charts in the panel: Hs vs swell (the gap is locally generated wind sea) · wave energy flux
over the window · wind departure from the daily mean · upwelling index per step.

**Every one of these prints its own relation under the value**, and the block carries a
standing note: *computed on this device from the conditions above — diagnostics, not
measurements; cite the ERDDAP series instead.*

`buildForecastHours()` lives in the same file so the dashboard chart and the Weather page
cannot disagree about the eight-step window.

---

## 11. Backend contract

Base URL: `process.env.NEXT_PUBLIC_SALTY_API_URL` (default `http://127.0.0.1:8010`).
Timeout 7 s; 30 s circuit-breaker cooldown on connection failure.

### Fisherman — `lib/fisherman-api.js`

```
GET  /api/fisherman/zones?lat&lon            -> PfzZoneFeature[]
GET  /api/fisherman/zones/:id?lat&lon        -> ZoneDetail
GET  /api/fisherman/conditions?lat&lon       -> PointConditions
GET  /api/fisherman/alerts?lat&lon           -> OceanAlert[]
POST /api/fisherman/risk/assess              -> TripRiskResult
POST /api/fisherman/trip/start               -> TripSession
POST /api/fisherman/trip/:id/ping            -> void
POST /api/fisherman/trip/:id/end             -> void
```

### Operations — `lib/operations-api.js`

```
GET  /api/operations/fleet?lat&lon           -> TrackedFisherman[]
POST /api/operations/sar/predict             -> SarPrediction
```

### Research & agent

```
POST /api/research/series                    -> ResearchSeries
POST /api/llm/chat                           -> AgentResponse
GET  /api/call-agent/status                  -> CallAgentStatus
POST /api/call-agent/call                    -> ExotelCallResponse
```

### Key shapes

```ts
interface PfzZoneFeature {
  id, name, lat, lon,
  radiusNM,            // advisory circle radius, drawn to scale
  suitabilityScore, suitabilityText,
  distanceNM, bearing, bearingDeg,
  depthMeters, referencePort,
  primarySpecies: string[],
}

interface TripRiskResult {
  score: number,                                   // 0–100
  level: "Low" | "Moderate" | "Elevated" | "High",
  summary: string,
  safeWindow: string | null,
  factors: { name, value, score }[],
  recommendations: string[],
  precautions: string[],
}

interface SarPrediction {
  datumLat, datumLon,
  driftDistanceNM, driftBearingDeg, driftBearingText,
  searchRadiusNM, searchAreaSqNM,
  windLeewayKnots, currentKnots, tideKnots,
  recommendedPattern,
  driftPath: LatLon[],                             // oldest first
}

interface TrackedFisherman {
  id, skipper, boatName, regNumber, vesselType, crewCount, homePort, mmsi,
  lat, lon, headingDeg, headingText, speedKnots, lastPingAt, distanceFromPortNM,
  status: "underway" | "fishing" | "returning" | "overdue" | "sos",
  destinationZoneId, destinationZoneName, destinationLat, destinationLon, distanceToZoneNM,
  track: LatLon[],                                 // recent breadcrumb, oldest first
}
```

---

## 12. State, storage and persistence

### React context — `lib/marine-context.jsx`

`role`, `setRole`, `phoneNumber`, `setPhoneNumber`, `location`, `setLocationId`,
`isAiDrawerOpen`, `setIsAiDrawerOpen`, `savedZoneIds`, `toggleSaveZone`, `activeAlertCount`,
`backendStatus`, `refreshBackendLayers`, `operatorNotifications`, `addOperatorNotification`,
`dismissNotification`, `activeJourney`, `startJourney`.

### localStorage keys

| Key | Written by | Holds |
|---|---|---|
| `salty_role` | login / role switcher | `fisherman` \| `researcher` \| `operator` |
| `salty_phone_number` | login | number for the Exotel call agent |
| `salty_location` | port picker | selected coastal location id |
| `salty_lang` | language switch | one of the 10 language codes |
| `salty_planned_trips` | risk sheet | trips saved from a safety check |
| `salty_trip_history` | trip tracker | completed trip records |
| `salty_search_cases` | SAR console | open search cases (cap 20) |
| `salty_focused_case` | "show on map" | which case the map should open on |
| `salty_dataset_bookmarks` | research console | bookmarked ERDDAP dataset ids |
| `salty_research_alerts` | report-finding card | escalations to operations (cap 60) |
| `salty_agent_data_context` | "Ask AI about this data" | dataset context for the agent |

### The store pattern

Each store is `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` over
localStorage, with a cached snapshot invalidated on write. This gives real cross-component
reactivity without a state library and is SSR-safe (`getServerSnapshot` returns a stable
empty value).

### Onboarding gate

`RoleGate` requires **both** `salty_role` and `salty_phone_number` before `/app/*` renders;
otherwise it redirects to `/login?next=<path>`.

---

## 13. Honesty rules — the non-negotiables

These come from the project handoff document and govern every integration:

> **Do not replace this with generated points, fake heatmaps, SVG map backgrounds, or
> synthetic wind arrows.**
>
> **Never silently fall back to generated marine values.**
>
> **Always inspect the official INCOIS page/source/network requests first. Record the exact
> URL, protocol, dataset/layer, variables, required parameters, and HTTP result before
> integrating a new service.**
>
> **Do not hardcode guessed dataset filenames when updating this integration.**
>
> **Do not guess PFZ WMS URLs.**

How they show up in the code:

- Every fallback is **labelled**, never silent — `Sourced<T>` + `DataBadge`
- The demo risk score sheet carries an explicit "do not sail on it" warning
- A demo SAR datum warns "do not task units on it alone — confirm against INCOIS SARAT"
- The offline map card says plainly that offline tiles are not built yet
- Derived physics is labelled derived, with the relation printed
- Research facets inferred from a dataset id are labelled "from id"
- **Ocean-colour / chlorophyll WMS was deliberately NOT added** — it needs a request capture
  off the official page first, and guessing the URL would break the rule above
- Verification claims are only made when a build or test actually ran. When both the device
  bridge and the container shell dropped mid-session, that was reported honestly rather than
  claiming a verification that had not happened.

---

## 14. Known issues, deliberate gaps, and what is next

### Known issues

| Issue | Impact | Mitigation |
|---|---|---|
| MapLibre web worker fails to load in the dev server | GeoJSON never tiles; any vector line would not draw | Everything drawn as DOM markers; paths use two filtered raster-free line layers |
| HMR websocket fails in the sandbox | dev-mode never hydrates there | All verification runs against a **production build** |
| Device VM cannot run Next | no linux SWC binary, no network (`EAI_AGAIN`) | Builds and screenshots run in the cloud container from staged sources |
| griddap axis order | assumes `[time][lat][lon]` | Holds for the INCOIS datasets in use; worth a per-dataset check later |

### Deliberate gaps

- **Offline map tiles** — scaffolded and honestly labelled, not built. You chose to build it
  later; the UI and online/offline detection are real so the shape is right.
- **Ocean-colour / chlorophyll WMS layer** — blocked on a request capture, per the handoff rule.
- **Research alerts and SAR cases are device-local** — the researcher→operator hand-off works
  today without waiting on the backend; the same payload shape should POST when it lands.
- **Data-sourced text is untranslated** — INCOIS zone names, alert bodies, species and market
  rows stay English by design.

### Next steps

1. Swap the localStorage escalation queue for the real endpoint once the backend exposes it
2. Replace `demoPrediction` with the teammate's drift model — the UI already handles both
   through `Sourced<T>`, so this is a one-line switch on the client
3. Capture the ocean-colour WMS request and add chlorophyll as a research layer
4. Build offline tile caching for the fisherman map
5. Extend translation coverage — the fall-through design means keys can be added
   incrementally without breaking any screen

---

## 15. Running it

```bash
# install
npm install

# dev
npm run dev            # http://localhost:3000

# verify — the loop used throughout this build
npx eslint app components lib
npx next build         # production build
npx next start -p 3000
```

**Environment**

```
NEXT_PUBLIC_SALTY_API_URL=http://127.0.0.1:8010   # optional; this is the default
```

With no backend running, every screen still works and everything sourced from a fallback is
badged **Demo data**.

**Current verification status:** **0 lint errors, 1 warning** · production build compiles,
17 routes generated · all three consoles render with no runtime errors.

---

## 16. Build history — what was changed and why

This section is the working record of the session, kept because the *why* behind several
decisions is not obvious from the code alone.

### Governing decisions (agreed up front)

1. **Real API calls with a mock fallback, badged** — not mock-only, not real-only
2. **Offline map scaffolded now, built later**
3. **Other roles are untouched when working on one role**

### Fisherman console

- Built the five sections and the mobile bottom tab bar
- Fishing Zones made map-first with tappable PFZ circles
- Risk & Safety restructured as location → trip form → result sheet
- Vessel/GPS rebuilt as live trip tracking with planned trips and history
- Marine Map and Lost Fisherman removed from this role
- Chlorophyll, pressure and thermal-front metrics stripped from the fisherman dashboard
  — *"remove complex marix from here that are not reqiure for a fisher man"*
- A demo risk computation was added after an initial refusal, once you asked for it
  explicitly — kept fully badged and with a "do not sail on it" warning

### Map work

- **Blank map fixed** — the `maplibre-gl.css` `position: relative` override (§9)
- **Zone circles fixed** — worker failure worked around with DOM markers sized to real radius
- Built-in `background` ocean basemap so vectors show with no external tiles
- Percentage labels reduced to a 10 px pill
- StrictMode teardown hardened; readiness moved to `style.load`

### Researcher console

- Live ERDDAP catalogue with bookmarking and working griddap downloads
- Hand-rolled SVG chart kit following the dataviz palette rules (blue `#2a78d6`, orange
  `#eb6834`, aqua `#1baf7a`; one y-axis; sequential = one hue; diverging = blue↔red with a
  gray midpoint; hover layer; table view as contrast relief)
- Dashboard → coastal operations escalation, verified end-to-end with Playwright (7/7)
- INCOIS iframe header/footer cropped
- Fishing Zones section removed from this role
- **This session:** demo banner reduced to a thin amber rule; four researcher-only weather
  variables added; `MarineSciencePanel` built with eight derived quantities and four charts;
  a compact version added to the researcher dashboard

### Operator console

- Six sections; Risk & Safety and Vessel/GPS removed
- `OperationsMap` built — side-by-side map + panel, layer toggles, fleet, hazards, search
  areas, drift paths
- SAR console wired to `predictSearchZone` + `saveSearchCase`; "Datum Solved" replaced with
  a real `DataBadge`
- **This session:** the drift-time control — live slider, live re-projection, on-map
  calculation card, and "project drift from last ping" on any vessel

### UI / responsive work (this session)

- Lost Fisherman mobile: heading no longer wraps to two lines, the "drift in progress" badge
  no longer overflows its pill, the datum block stacks, buttons go full-width
- Weather page: header actions stack so "AI Forecast Summary" stops running off-screen;
  metric cards, forecast blocks and the tide table shrink on small screens
- Operator dashboard: fleet rows stack instead of three columns fighting over 390 px

### Multi-language (this session)

- `lib/i18n.jsx` — 10 languages, ~190 keys, fall-through to English
- `LanguageSwitch` in the header (fisherman only)
- `SpeakButton` + `speech-text.ts` — six read-aloud points
- Translated: nav, dashboard (all five cards), fishing zones (map + panel), risk & safety
  (form + result sheet), trip tracking, offline map card, data badge, conditions grid,
  assistant hero/placeholder/suggestions, and the shared map's chips (fisherman only)

### Bugs fixed along the way

- **WMS 400 Bad Request** — bare filename vs required directory prefix (§5.1)
- **Blank map / no controls** — CSS specificity collapsing the container to zero height
- **Zone circles never drawing** — MapLibre worker failure
- **`line-dasharray` with a `case` expression** — not data-driven; would have broken the
  entire map style. Caught before shipping and split into two filtered layers.
- **10 React hooks lint errors** across three rounds — the new `react-hooks/set-state-in-effect`
  and `react-hooks/refs` rules. Fixed by moving `ref.current = x` into effects, deriving
  loading from a "loaded key" instead of a flag set at the top of an effect, using
  `useSyncExternalStore` for geolocation support, deriving `activeVariable` rather than
  correcting it in an effect, keying map inspection to `forOverlay`, adjusting mode state
  during render, and restricting `setState` to promise callbacks in `call-agent-launcher`.
- **`useMemo` dependency churn** — the drift `projection` object was rebuilt every render,
  invalidating two downstream memos; wrapped in its own `useMemo`.

---

*Document generated from the SALTY codebase at `C:\Users\ruthw\OneDrive\Desktop\SaltyAI`.
Every endpoint, constant, formula and file path above was read out of the source rather
than recalled.*

---

## 17. The TypeScript → JavaScript conversion

The project was originally written in TypeScript and converted to plain JavaScript.
This section records how, so the result can be trusted and, if needed, understood later.

### Why it was safe to do mechanically

A scan of all 97 source files found **zero** constructs that require rewriting rather than
deletion:

| Construct | Count | Why it matters |
|---|:--:|---|
| `enum` | 0 | Enums emit real runtime objects — they must be rewritten, not erased |
| `namespace` | 0 | Same — emits runtime code |
| decorators | 0 | Runtime semantics |
| constructor parameter properties | 0 | `constructor(private x)` assigns at runtime |
| `declare` / ambient | 0 | |
| `implements` / `abstract` | 0 | |
| `satisfies` | 0 | |

Everything actually present — 123 interfaces and type aliases, 49 type-only imports,
20 `as const`, 6 generic functions, 2 non-null assertions — is **erasable syntax**. Removing
it cannot change runtime behaviour.

### The method

`ts-blank-space` replaces type syntax with whitespace **in place**, preserving every line
and column, so no expression is ever reprinted or re-inferred. `.tsx` files were parsed with
`ScriptKind.TSX` — parsing them as plain TS makes every `<div>` look like a legacy
`<Type>expr` assertion, which produced a false 3,000-line error report on the first attempt.
Prettier then collapsed the whitespace left behind.

```
.ts / .tsx  ──► ts-blank-space (TSX-aware parse) ──► prettier ──► .js / .jsx
```

Comments survived intact, including the JSDoc inside type declarations, which was blanked
along with the declaration rather than left orphaned.

### What changed outside the source files

| Before | After |
|---|---|
| `tsconfig.json` | `jsconfig.json` — keeps the `@/*` path alias and `jsx: react-jsx` |
| `next.config.ts` | `next.config.mjs` — with a `@type` JSDoc pragma for editor hints |
| `next-env.d.ts`, `tsconfig.tsbuildinfo` | deleted |
| devDeps: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/geojson` | removed |
| `eslint.config.mjs` imported `eslint-config-next/typescript` | that import dropped |
| — | `.prettierrc` added (printWidth 90, double quotes, es5 trailing commas) |

Run `npm install` once to refresh `package-lock.json` — it still references the removed
type packages until you do.

### What this costs

**The type checker is gone.** In this project's own history, `tsc` caught a
use-before-declaration in the fisherman widget, a malformed import in the agent page, and
three prop mismatches on the map — each before it reached a browser. That net no longer
exists, which matters most at the boundary with the backend: `TripRiskResult`,
`SarPrediction` and `TrackedFisherman` are now conventions rather than enforced contracts.
§11 is the authority on those shapes.

**ESLint still carries real weight.** Dropping the TypeScript ESLint config removed 59
type-specific warnings, but every React Hooks rule remains at **error** level — including
`react-hooks/set-state-in-effect` and `react-hooks/refs`, the two that caught genuine bugs
during the build. Verified by inspecting the resolved config, not assumed.

### Verification after conversion

- `next build` — compiles, all 17 routes generated
- `eslint app components lib` — **0 errors**, 1 warning (a pre-existing `<img>` hint in
  `components/marine-map.jsx`)
- Seven pages screenshotted across all three roles and three languages — **no runtime
  errors on any page**, and the rendering is identical to the TypeScript build
- The file tree written to the machine was checksum-compared against the tested build and
  matched byte for byte
