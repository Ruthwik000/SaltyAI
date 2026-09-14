/**
 * The one marine risk model.
 *
 * Until now SALTY had two. `riskScore()` in live-data.js took the MAX of five
 * thresholded factors and knew nothing about the boat; `demoTripRisk()` in
 * fisherman-api.js took a WEIGHTED SUM of six different ones and did. The same
 * afternoon could read Low on the home tile and Elevated on the safety page,
 * which is worse than either model being imperfect. Both now call this.
 *
 * How a score is built
 * --------------------
 * 1. Each factor is scored 0-100 on its own linear ramp between a caution and
 *    a danger value. Below caution it contributes nothing; above danger it is
 *    saturated at 100. Visibility ramps downward (less is worse), which is why
 *    its danger value is the smaller number.
 * 2. Sea-state factors are multiplied by the boat's exposure. An open country
 *    craft meets the same sea as a 65 ft longliner at more than twice the
 *    score, which is the entire reason the trip form asks for boat type.
 * 3. The factors are combined so that the WORST ONE IS A FLOOR and the others
 *    lift the score into the headroom above it:
 *
 *        score = worst + (100 - worst) x (mean of the rest / 100) x 0.6
 *
 *    A plain max() — the old dashboard model — said a 3 m sea alone was
 *    exactly as dangerous as a 3 m sea plus 22 kt of wind plus a 5 s period,
 *    which is backwards. A plain weighted mean — the old trip model — let one
 *    severe factor be averaged away by four calm ones, which is worse. This
 *    keeps the guarantee of both: never below your worst single factor, and
 *    several moderate factors do add up. 0.6 damps the lift so a pile of mild
 *    factors cannot manufacture a severe score on its own.
 *
 * Every component is returned with its own value and score, because a number a
 * skipper cannot argue with is not worth showing them.
 *
 * This is a forecast-driven INDEX, not a prediction, and not a substitute for
 * the IMD and INCOIS bulletins.
 */

const G = 9.81;
const MS_PER_KNOT = 0.514444;

/** How exposed the hull is to the same sea. */
export const BOATS = {
  craft: { label: "Country craft, no engine (under 24 ft)", short: "country craft", factor: 1.55 },
  motorized: { label: "Motorised FRP craft (28-34 ft)", short: "motorised FRP craft", factor: 1.15 },
  trawler: { label: "Mechanised trawler (48 ft)", short: "mechanised trawler", factor: 0.85 },
  longliner: { label: "Deep-sea longliner (65 ft+)", short: "deep-sea longliner", factor: 0.7 },
};

/** The boat used when a trip does not name one. */
export const DEFAULT_BOAT = "motorized";

/**
 * caution -> 0, danger -> 100. Values are SI: metres, m/s, mm, km, NM, hours.
 * `boat` marks the factors the hull changes; rain, visibility, darkness and
 * distance-after-dark are hazards to any boat equally.
 */
const FACTORS = {
  wave: { caution: 2, danger: 4, weight: 0.24, boat: true, label: "Wave height", unit: "m" },
  wind: { caution: 12, danger: 24, weight: 0.18, boat: true, label: "Wind", unit: "m/s" },
  range: { caution: 25, danger: 60, weight: 0.13, boat: true, label: "Distance out", unit: "NM" },
  swell: { caution: 1.5, danger: 3, weight: 0.12, boat: true, label: "Swell", unit: "m" },
  steepness: { caution: 0.04, danger: 0.08, weight: 0.08, boat: true, label: "Wave steepness", unit: "" },
  gust: { caution: 17, danger: 32, weight: 0.08, boat: true, label: "Gusts", unit: "m/s" },
  visibility: { caution: 6, danger: 1, weight: 0.06, boat: false, label: "Visibility", unit: "km" },
  current: { caution: 0.8, danger: 1.5, weight: 0.05, boat: true, label: "Current", unit: "m/s" },
  night: { caution: 2, danger: 10, weight: 0.04, boat: false, label: "Hours after dark", unit: "h" },
  rain: { caution: 15, danger: 50, weight: 0.02, boat: false, label: "Rain", unit: "mm" },
};

/** How much the factors below the worst one can lift the score. */
const COMPOUNDING = 0.6;

const clamp = (value) => Math.max(0, Math.min(100, value));

function ramp(value, caution, danger) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const magnitude = Math.abs(Number(value));
  if (danger === caution) return magnitude >= danger ? 100 : 0;
  return clamp(((magnitude - caution) / (danger - caution)) * 100);
}

export const knotsToMs = (knots) =>
  knots === null || knots === undefined ? null : Number(knots) * MS_PER_KNOT;

/**
 * Wave steepness, Hs / L with the deep-water wavelength L = gT^2 / 2pi.
 * This is what separates a 2 m swell at 12 s, which is a gentle roll, from a
 * 2 m wind sea at 5 s, which breaks. Height alone cannot tell them apart.
 */
export function waveSteepness(heightM, periodS) {
  if (!Number.isFinite(Number(heightM)) || !Number.isFinite(Number(periodS))) return null;
  if (Number(periodS) <= 0) return null;
  const wavelength = (G * Number(periodS) ** 2) / (2 * Math.PI);
  return wavelength > 0 ? Number(heightM) / wavelength : null;
}

export function riskLevel(score) {
  if (score === null || score === undefined) return null;
  if (score >= 70) return "High";
  if (score >= 50) return "Elevated";
  if (score >= 30) return "Moderate";
  return "Low";
}

/** True when the level means "do not go", as opposed to "go carefully". */
export function isStopLevel(level) {
  return level === "High" || level === "Severe";
}

/**
 * Score one set of conditions.
 *
 * features: { wave, swell, period, wind, gust, current, rain, visibility,
 *             range, night, steepness? } — SI units, any subset. Missing
 *             factors are dropped and the weights renormalised over what is
 *             actually known, so a thin forecast is not silently scored as calm.
 * options:  { boat: "craft" | "motorized" | "trawler" | "longliner" }
 */
export function assessRisk(features = {}, options = {}) {
  const boat = BOATS[options.boat || options.boatType] || null;
  const exposure = boat ? boat.factor : 1;

  const inputs = { ...features };
  if (inputs.steepness === undefined || inputs.steepness === null) {
    inputs.steepness = waveSteepness(features.wave, features.period);
  }

  const components = [];
  for (const [key, spec] of Object.entries(FACTORS)) {
    const base = ramp(inputs[key], spec.caution, spec.danger);
    if (base === null) continue;
    components.push({
      key,
      label: spec.label,
      unit: spec.unit,
      value: Number(inputs[key]),
      score: Math.round(clamp(spec.boat ? base * exposure : base)),
      weight: spec.weight,
    });
  }

  if (components.length === 0) {
    return {
      score: null,
      level: null,
      components: [],
      boat: boat ? boat.label : null,
      boatFactor: exposure,
      worst: null,
    };
  }

  components.sort((a, b) => b.score - a.score);
  const worst = components[0];
  const rest = components.slice(1);
  const restWeight = rest.reduce((sum, item) => sum + item.weight, 0);
  const restMean = restWeight
    ? rest.reduce((sum, item) => sum + item.score * item.weight, 0) / restWeight
    : 0;

  const score = Math.round(
    clamp(worst.score + ((100 - worst.score) * restMean * COMPOUNDING) / 100)
  );

  return {
    score,
    level: riskLevel(score),
    components,
    worst: worst.key,
    boat: boat ? boat.label : null,
    boatFactor: exposure,
  };
}

/**
 * Score a trip rather than an instant.
 *
 * A day's risk used to be the max across all 24 hours, so one rough hour at
 * 03:00 condemned a 05:00-14:00 trip. This scores only the hours the boat is
 * actually out, and reports the first hour conditions cross into `crossLevel`
 * — which is the number a skipper can act on: when to turn back.
 *
 * hours: [{ time, ...features }] with ISO-ish local times.
 */
export function assessWindow(hours = [], options = {}) {
  const { from, to, crossLevel = "Elevated" } = options;
  const start = from ? new Date(from).getTime() : -Infinity;
  const end = to ? new Date(to).getTime() : Infinity;

  const inWindow = hours.filter((hour) => {
    const at = new Date(hour.time).getTime();
    return Number.isFinite(at) ? at >= start && at <= end : false;
  });
  const scored = (inWindow.length ? inWindow : hours)
    .map((hour) => ({ time: hour.time, ...assessRisk(hour, options) }))
    .filter((hour) => hour.score !== null);

  if (scored.length === 0) {
    return { score: null, level: null, components: [], worstAt: null, crossesAt: null, hours: [] };
  }

  const peak = scored.reduce((worst, hour) => (hour.score > worst.score ? hour : worst), scored[0]);
  const threshold = crossLevel === "High" ? 70 : crossLevel === "Elevated" ? 50 : 30;
  const crossing = scored.find((hour) => hour.score >= threshold) || null;

  return {
    score: peak.score,
    level: peak.level,
    components: peak.components,
    worst: peak.worst,
    worstAt: peak.time,
    crossesAt: crossing ? crossing.time : null,
    boat: peak.boat,
    boatFactor: peak.boatFactor,
    hours: scored,
  };
}

/**
 * Backwards-compatible shim for the old five-factor call site. Same name, same
 * { score, level } shape; the model underneath is the one above.
 */
export function riskScore(features) {
  const { score, level } = assessRisk(features);
  return { score: score ?? 0, level: level ?? "Low" };
}
