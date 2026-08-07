/**
 * Adds two 32-bit datapath values.
 */
export function add(inputA: number, inputB: number): number {
  if (
    !Number.isInteger(inputA) ||
    !Number.isInteger(inputB)
  ) {
    throw new Error(
      "Adder inputs must be integers.",
    );
  }

  return (inputA + inputB) | 0;
}