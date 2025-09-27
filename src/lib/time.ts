export const tsToMs = (t: unknown): number => {
  if (typeof t === "number") return t;
  if (typeof t === "string") {
    const n = Date.parse(t);
    return Number.isNaN(n) ? 0 : n;
  }
  if (t instanceof Date) return t.getTime();
  return 0;
};

export const tsToIso = (t: unknown): string => {
  const ms = tsToMs(t);
  return ms ? new Date(ms).toISOString() : "";
};
