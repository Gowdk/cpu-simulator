export const MULTI_CYCLE_STATES = [
  "instruction-fetch",
  "instruction-decode",
  "memory-address",
  "memory-read",
  "memory-write",
  "memory-writeback",
  "r-type-execute",
  "r-type-writeback",
  "branch",
  "jump",
] as const;

export type MultiCycleState =
  (typeof MULTI_CYCLE_STATES)[number];
