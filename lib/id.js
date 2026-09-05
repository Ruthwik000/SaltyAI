let counter = 0;

export function generateMessageId(prefix = "m") {
  counter += 1;
  const time = typeof Date !== "undefined" ? Date.now() : 0;
  return `${prefix}-${time}-${counter}`;
}
