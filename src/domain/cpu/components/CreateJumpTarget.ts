/*
    Simulates the "merging" of the PC + 4 [31:27] high bits with the jump [27:0] low bits

*/
export interface JumpTargetResult {
  readonly shiftedIndex: number;
  readonly upperPcBits: number;
  readonly targetPc: number;
}

const MAX_JUMP_INDEX = 0x03ffffff;

export function createJumpTarget(
  sequentialPc: number,
  instructionIndex: number,
): JumpTargetResult {
  if (
    !Number.isInteger(instructionIndex) ||
    instructionIndex < 0 ||
    instructionIndex > MAX_JUMP_INDEX
  ) {
    throw new Error(
      `Invalid 26-bit jump target: ${instructionIndex}`,
    );
  }

  const shiftedIndex =
    instructionIndex << 2;

  const upperPcBits =
    sequentialPc & 0xf0000000;

  const targetPc =
    (
      upperPcBits |
      (shiftedIndex & 0x0fffffff)
    ) >>> 0;

  return {
    shiftedIndex,
    upperPcBits,
    targetPc,
  };
}