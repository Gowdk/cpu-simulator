import {
  DataMemory,
} from "../../components/DataMemory";
import {
  InstructionMemory,
} from "../../components/InstructionMemory";
import type {
  Instruction,
} from "../../instructions/Instruction";

/**
 * Presents one conceptual multicycle memory component while
 * preserving the project's current structured-instruction model.
 *
 * InstructionMemory stores Instruction objects, whereas DataMemory
 * stores numeric words. This facade keeps those representations
 * separate internally until binary instruction encoding is added.
 */
export class MultiCycleMemory {
  private readonly instructionMemory:
    InstructionMemory;

  private readonly dataMemory:
    DataMemory;

  public constructor(
    program: readonly Instruction[],
  ) {
    this.instructionMemory =
      new InstructionMemory(program);

    this.dataMemory =
      new DataMemory();
  }

  public readInstruction(
    address: number,
  ): Instruction {
    return this.instructionMemory.read(
      address,
    );
  }

  public readData(
    address: number,
  ): number {
    return this.dataMemory.read(address);
  }

  public writeData(
    address: number,
    value: number,
  ): void {
    this.dataMemory.write(
      address,
      value,
    );
  }

  public resetData(): void {
    this.dataMemory.reset();
  }
}
