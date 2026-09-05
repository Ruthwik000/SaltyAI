/**
 * INCOIS Ocean State Forecast WMS layer definitions.
 *
 * Variables, styles and dataset paths were read from the official OSF page
 * source at https://www.incois.gov.in/oceanservices/osfforecast.jsp — do not
 * guess new ones, capture them from that page first.
 *
 * Requests go through /api/incois/wms (server-side) because the INCOIS host
 * sends no Access-Control-Allow-Origin header.
 */

export const osfLayers = {
  wind: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "UWND:VWND-mag",
    style: "raster/x-Occam",
    label: "Wind speed",
    unit: "m/s",
  },
  waves: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "HS",
    style: "raster/x-Rainbow",
    label: "Significant wave height",
    unit: "m",
  },
  swell: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "PHS01",
    style: "raster/x-Rainbow",
    label: "Swell height",
    unit: "m",
  },
  currents: {
    path: "currents/CURRENTS_NIO_latest.nc",
    layer: "U:V-mag",
    style: "raster/x-Rainbow",
    label: "Surface currents",
    unit: "m/s",
  },
  sst: {
    path: "winds/SST_NIO_latest.nc",
    layer: "SST",
    style: "raster/x-Rainbow",
    label: "Sea surface temperature",
    unit: "°C",
  },
  wavePeriod: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "T02",
    style: "raster/x-Rainbow",
    label: "Wave period",
    unit: "s",
  },
  swellPeriod: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "PTP01",
    style: "raster/x-Rainbow",
    label: "Swell period",
    unit: "s",
  },
  mld: {
    path: "winds/MLD_NIO_latest.nc",
    layer: "MLD",
    style: "raster/x-Rainbow",
    label: "Mixed layer depth",
    unit: "m",
  },
  d20: {
    path: "winds/MLD_NIO_latest.nc",
    layer: "D20",
    style: "raster/x-Rainbow",
    label: "20°C isotherm depth",
    unit: "m",
  },
};

/**
 * What a fisherman is offered: the five fields that change whether a trip is
 * workable. The rest are research fields and only appear on that console.
 */
export const basicOsfLayers = ["wind", "waves", "swell", "currents", "sst"];

/** Every verified variable from the official OSF page source. */
export const researchOsfLayers = [
  "sst",
  "currents",
  "wind",
  "waves",
  "swell",
  "wavePeriod",
  "swellPeriod",
  "mld",
  "d20",
];

/** Yesterday's issue stamp, used only until /api/incois/osf-config responds. */
function issueStamp() {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
}

export function osfDatasetPath(key, files) {
  const fallback = osfLayers[key].path.replace("latest", issueStamp());
  const discovered =
    key === "sst"
      ? files?.sst
      : key === "currents"
        ? files?.currents
        : key === "mld" || key === "d20"
          ? files?.mld
          : files?.waves;
  if (!discovered) return fallback;

  // /api/incois/osf-config reports bare filenames (CURRENTS_NIO_20260903.nc).
  // The THREDDS WMS endpoint — and the dataset allow-list in
  // /api/incois/wms — both need the directory prefix, so put it back.
  if (discovered.includes("/")) return discovered;
  const directory = osfLayers[key].path.split("/")[0];
  return `${directory}/${discovered}`;
}

/** Tile template for a MapLibre raster source. */
export function osfTileUrl(key, files, time) {
  const def = osfLayers[key];
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: def.layer,
    STYLES: def.style,
    FORMAT: "image/png",
    TRANSPARENT: "true",
    SRS: "EPSG:3857",
    WIDTH: "256",
    HEIGHT: "256",
    COLORSCALERANGE: "auto",
  });
  if (time) params.set("TIME", time);
  return (
    "/api/incois/wms?dataset=" +
    encodeURIComponent(osfDatasetPath(key, files)) +
    "&" +
    params.toString() +
    "&BBOX={bbox-epsg-3857}"
  );
}

export function osfLegendUrl(key, files) {
  const def = osfLayers[key];
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetLegendGraphic",
    FORMAT: "image/png",
    LAYER: key === "currents" ? "CURRENT" : def.layer,
    COLORSCALERANGE: "auto",
    numcolorbands: "250",
    transparent: "TRUE",
    styles: def.style,
  });
  return (
    "/api/incois/wms?dataset=" +
    encodeURIComponent(osfDatasetPath(key, files)) +
    "&" +
    params.toString()
  );
}

/**
 * Coastline / administrative boundary raster served by the INCOIS GeoServer,
 * proxied through the existing frame route so the browser sees same-origin
 * tiles. Layer name captured from the official OSF page source.
 */
export const boundaryTileUrl =
  "/api/incois/frame/geoserver/BaseMaps-Common/wms" +
  "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
  "&LAYERS=BaseMaps-Common%3Agdam_410_l0_india_corrected" +
  "&FORMAT=image%2Fpng&TRANSPARENT=true&SRS=EPSG%3A3857" +
  "&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}";

export const osmTileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const satelliteTileUrl =
  "https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";

/**
 * Point query against the active forecast layer, proxied server-side because
 * the INCOIS host sends no CORS header. Returns the raw text/plain body that
 * THREDDS produces for GetFeatureInfo.
 */
export function osfFeatureInfoUrl(key, lat, lon, files, time) {
  const def = osfLayers[key];
  const pad = 0.05;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetFeatureInfo",
    LAYERS: def.layer,
    QUERY_LAYERS: def.layer,
    INFO_FORMAT: "text/plain",
    SRS: "EPSG:4326",
    WIDTH: "101",
    HEIGHT: "101",
    X: "50",
    Y: "50",
    BBOX: `${lon - pad},${lat - pad},${lon + pad},${lat + pad}`,
  });
  if (time) params.set("TIME", time);
  return (
    "/api/incois/wms?dataset=" +
    encodeURIComponent(osfDatasetPath(key, files)) +
    "&" +
    params.toString()
  );
}
