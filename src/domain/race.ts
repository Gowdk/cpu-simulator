import type {
  CpuSpecification,
  Program,
  RaceResult,
} from "../domain/models.ts";
import {
  calculatePerformance,
  calculateRelativePerformance,
} from "../domain/performance.ts";

/**
 * Relative comparison tolerance used to avoid declaring a winner because of a
 * tiny floating-point rounding difference.
 */
const DEFAULT_RELATIVE_TIE_TOLERANCE = 1e-12;

export function compareCpus(
  cpuA: CpuSpecification,
  cpuB: CpuSpecification,
  program: Program,
  relativeTieTolerance = DEFAULT_RELATIVE_TIE_TOLERANCE,
): RaceResult {
  const performanceA = calculatePerformance(cpuA, program);
  const performanceB = calculatePerformance(cpuB, program);

  const executionTimeDifference = Math.abs(
    performanceA.executionTimeSeconds - performanceB.executionTimeSeconds,
  );

  const largestExecutionTime = Math.max(
    performanceA.executionTimeSeconds,
    performanceB.executionTimeSeconds,
  );

  const isTie =
    executionTimeDifference <= largestExecutionTime * relativeTieTolerance;

  if (isTie) {
    return {
      program,
      cpuA: performanceA,
      cpuB: performanceB,
      isTie: true,
      winner: null,
      loser: null,
      winningSpeedup: null,
    };
  }

  const winner =
    performanceA.executionTimeSeconds < performanceB.executionTimeSeconds
      ? performanceA
      : performanceB;

  const loser = winner === performanceA ? performanceB : performanceA;

  return {
    program,
    cpuA: performanceA,
    cpuB: performanceB,
    isTie: false,
    winner,
    loser,
    winningSpeedup: calculateRelativePerformance(winner, loser),
  };
}

