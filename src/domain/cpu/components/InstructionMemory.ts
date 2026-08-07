import type { Instruction } from "../instructions/Instruction";

/*
    To be used in the simplified version of the Single Cycle Implementation.
    Eventually, Instruction Memory must be combined with data memory.

*/
export class InstructionMemory {
  private readonly instructions: readonly Instruction[];

  public constructor(instructions: readonly Instruction[]) {
    this.instructions = instructions;
  }

  public read(pc: number): Instruction {
    const instructionIndex = pc / 4;    // MIPS is 4 byte-addressed.
    const instruction = this.instructions[instructionIndex];

    if (!instruction) {
      throw new Error(`No instruction exists at PC ${pc}.`);
    }

    return instruction;
  }
}