/**
 * The sentences the app reads out loud.
 *
 * Built from the same translated templates the screen uses, so what is spoken
 * matches what is printed — including the language it is printed in. Values
 * that are missing are simply left out rather than spoken as "null".
 */

function num(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export function conditionsSpeech(t, place, conditions) {
  return t("speech.conditions", {
    place,
    waves: num(conditions.waveHeight),
    wind: conditions.windSpeed != null ? Math.round(conditions.windSpeed) : "—",
    dir: conditions.windDirection || "—",
    temp: num(conditions.sst),
    vis: num(conditions.visibility, 0),
  });
}

export function zoneSpeech(t, zone) {
  return t("speech.zone", {
    name: zone.name,
    distance: num(zone.distanceNM),
    bearing: zone.bearing,
    depth: zone.depthMeters,
    score: Math.round(zone.suitabilityScore),
  });
}

/* The backend grades "High"; the dictionary calls the top band severe. */
const LEVEL_KEYS = {
  low: "risk.level.low",
  moderate: "risk.level.moderate",
  elevated: "risk.level.elevated",
  high: "risk.level.severe",
  severe: "risk.level.severe",
};

export function riskLevelLabel(t, level) {
  const key = LEVEL_KEYS[level.toLowerCase()];
  return key ? t(key) : level;
}

export function riskVerdictLabel(t, level) {
  const value = level.toLowerCase();
  if (value === "low") return t("risk.verdict.go");
  if (value === "high" || value === "severe" || value === "elevated")
    return t("risk.verdict.stay");
  return t("risk.verdict.caution");
}

export function riskSpeech(t, result) {
  const head = t("speech.risk", {
    verdict: riskVerdictLabel(t, result.level),
    level: riskLevelLabel(t, result.level),
    score: result.score,
  });
  const advice = (result.recommendations || []).slice(0, 3).join(". ");
  return advice ? `${head} ${advice}.` : head;
}

/* ------------------------------------------------------------------ */
/* Data words                                                          */
/* ------------------------------------------------------------------ */

const CONDITION_KEYS = {
  fair: "cond.fair",
  cloudy: "cond.cloudy",
  "light rain": "cond.lightRain",
  squally: "cond.squally",
  thunderstorm: "cond.thunderstorm",
};

/** Translate a weather word that arrives from the data, not the layout. */
export function conditionLabel(t, condition) {
  const key = CONDITION_KEYS[condition.toLowerCase()];
  return key ? t(key) : condition;
}
