import type { Instruction } from "../instructions/Instruction";

/**
 * Read-only instruction memory for the CPU simulator.
 */
export class InstructionMemory {
  private readonly instructions: readonly Instruction[];

  public constructor(instructions: readonly Instruction[]) {
    this.instructions = instructions;
  }

  /**
   * Returns true when an instruction exists at the supplied byte address.
   *
   * This lets a pipelined CPU stop fetching after the final instruction
   * while allowing instructions already in the pipeline to drain.
   */
  public hasInstruction(pc: number): boolean {
    if (!this.isValidPc(pc)) {
      return false;
    }

    const instructionIndex = pc / 4;
    return instructionIndex < this.instructions.length;
  }

  public read(pc: number): Instruction {
    if (!this.isValidPc(pc)) {
      throw new Error(`Invalid instruction address: ${pc}.`);
    }

    const instructionIndex = pc / 4;
    const instruction = this.instructions[instructionIndex];

    if (!instruction) {
      throw new Error(`No instruction exists at PC ${pc}.`);
    }

    return instruction;
  }

  public getInstructionCount(): number {
    return this.instructions.length;
  }

  private isValidPc(pc: number): boolean {
    return (
      Number.isInteger(pc) &&
      pc >= 0 &&
      pc % 4 === 0
    );
  }
}
