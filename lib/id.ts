let counter = 0;

export function generateMessageId(prefix: "u" | "a" | "m" = "m"): string {
  counter += 1;
  const time = typeof Date !== "undefined" ? Date.now() : 0;
  return `${prefix}-${time}-${counter}`;
}
