// What ECharts expects from its host that a bare JavaScript engine (GraalJS)
// doesn't have. Charts are drawn synchronously with animation off, so timers
// only keep ECharts' animation loop going: they are accepted and never run.
// Imported first by reportEngine.ts.
const host = globalThis as Record<string, unknown>;
if (typeof host.setTimeout !== "function") host.setTimeout = () => 0;
if (typeof host.clearTimeout !== "function") host.clearTimeout = () => undefined;
export {};
