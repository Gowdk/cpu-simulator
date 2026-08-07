/**
 * Shifts a 32-bit value left by two bits.
 *
 * In the branch datapath, this converts an instruction
 * offset into a byte offset.
 */
export function shiftLeftTwice(value: number): number {
  if (!Number.isInteger(value)) {
    throw new Error(
      `Shift-left-two input must be an integer: ${value}`,
    );
  }

  return value << 2;
}