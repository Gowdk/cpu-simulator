import type {
  CpuPerformance,
  CpuSpecification,
  Program,
} from "../domain/models";

const HERTZ_PER_GIGAHERTZ = 1_000_000_000;

/**
 * Calculate CPU performance without modifying the CPU or program objects.
 *
 * Total cycles = instruction count × CPI
 * Execution time = total cycles ÷ clock rate
 */
export function calculatePerformance(
  cpu: CpuSpecification,
  program: Program,
): CpuPerformance {
  const clockRateHz = cpu.clockRateGHz * HERTZ_PER_GIGAHERTZ;
  const totalCycles = program.instructionCount * cpu.cyclesPerInstruction;

  return {
    specification: cpu,
    totalCycles,
    executionTimeSeconds: totalCycles / clockRateHz,
  };
}

/**
 * Return how many times faster the first result is than the second result.
 * A result above 1 means `first` is faster; a result below 1 means it is slower.
 */
export function calculateRelativePerformance(
  first: CpuPerformance,
  second: CpuPerformance,
): number {
  return second.executionTimeSeconds / first.executionTimeSeconds;
}
