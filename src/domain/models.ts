/**
 * The fixed characteristics of a CPU entered by the user.
 *
 * Calculated values do not belong here. Keeping this type immutable prevents
 * execution results from becoming stale when a specification changes.
 */
export interface CpuSpecification {
  readonly name: string;
  readonly clockRateGHz: number;
  readonly cyclesPerInstruction: number;
}

/** A program workload that will run on both CPUs. */
export interface Program {
  readonly name: string;
  readonly instructionCount: number;
}

/** The calculated performance of one CPU for one program. */
export interface CpuPerformance {
  readonly specification: CpuSpecification;
  readonly totalCycles: number;
  readonly executionTimeSeconds: number;
}

interface RaceResultBase {
  readonly program: Program;
  readonly cpuA: CpuPerformance;
  readonly cpuB: CpuPerformance;
}

/** A race whose execution times are equal within the configured tolerance. */
export interface TiedRaceResult extends RaceResultBase {
  readonly isTie: true;
  readonly winner: null;
  readonly loser: null;
  readonly winningSpeedup: null;
}

/** A race with one unambiguous winner. */
export interface DecisiveRaceResult extends RaceResultBase {
  readonly isTie: false;
  readonly winner: CpuPerformance;
  readonly loser: CpuPerformance;
  readonly winningSpeedup: number;
}

export type RaceResult = TiedRaceResult | DecisiveRaceResult;

/** All valid values produced after parsing the comparison form. */
export interface RaceConfiguration {
  readonly cpuA: CpuSpecification;
  readonly cpuB: CpuSpecification;
  readonly program: Program;
}
