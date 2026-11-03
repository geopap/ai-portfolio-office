// Portfolio policy as code.
// Every threshold the engine uses lives here, so a reviewer can see exactly why
// a flag was raised or a recommendation made — and change it in one place.

export const RULES = {
  version: '1.3.0',

  // A value KPI more than this far below plan is "behind"; above +ahead is "ahead".
  value: { behind: -0.05, ahead: 0.05 },

  // Spend vs. phase budget. Above `overrun` the reported cost RAG must not be green.
  cost: { overrun: 0.10, severeOverrun: 0.15 },

  // A status update older than this many days (at the as-of date) is stale.
  staleAfterDays: 35,

  // Stage-gate recommendation rules, evaluated in this order: STOP → REVISE → SCALE → CONTINUE.
  gate: {
    stop: {
      valueBelow: -0.40,          // the case no longer holds
      minFitForContinuation: 2,   // strategic fit at or below this, past Ideate…
      maxMonthsWithoutCase: 6,    // …or this long past Ideate without an approved business case
    },
    revise: { valueBelow: -0.10 },
    scale: { valueAbove: 0.08, phases: ['Develop', 'Realise'] },
  },

  // Prioritisation score weights (sum = 1). Effort and risk count inversely.
  priority: {
    weights: { fit: 0.30, value: 0.35, effort: 0.20, risk: 0.15 },
    mandatoryFloor: 70,           // regulatory / mandatory initiatives never score below this
    impactThreshold: 3.5,         // quadrant split on the 1–5 scale
    effortThreshold: 3.0,
  },

  // Capacity load bands, as a share of available FTE.
  capacity: { atCapacity: 0.95, overCommitted: 1.10 },

  // An upstream initiative with at least this many dependants is a bottleneck.
  bottleneckDependants: 3,

  // Exceptions surfaced on the one-page report.
  topExceptions: 4,
  topDecisions: 4,

  // Phrases in free-text updates that look like instructions to an AI system.
  // They are flagged for the human reviewer and always treated as data, never obeyed.
  injectionPatterns: [
    /ignore (all |any )?(previous|prior|above) instructions/i,
    /system (note|prompt|message)\s*:/i,
    /you are now/i,
    /disregard (the )?(rules|instructions)/i,
  ],
};
