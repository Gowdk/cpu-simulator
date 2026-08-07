/** Display execution time using a unit appropriate for its magnitude. */
export function formatExecutionTime(seconds: number): string {
  if (seconds >= 1) {
    return `${seconds.toFixed(4)} s`;
  }

  if (seconds >= 0.001) {
    return `${(seconds * 1_000).toFixed(4)} ms`;
  }

  return `${(seconds * 1_000_000).toFixed(4)} μs`;
}

/** Format cycle counts with locale-aware thousands separators. */
export function formatCycles(cycles: number): string {
  return cycles.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}
