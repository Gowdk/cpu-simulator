import type { Instruction } from "../../../instructions/Instruction";

export interface MEMWBContents {
  readonly instruction: Instruction;

  /**
   * The MEM stage has already resolved MemToReg before this value
   * enters MEM/WB. Arithmetic instructions carry their ALU result;
   * loads carry the value read from data memory.
   */
  readonly writeBackValue: number | null;

  readonly destinationRegister: number | null;
  readonly regWrite: boolean;
}

/**
 * Pipeline register between MEM and WB.
 *
 * null represents an empty pipeline slot / bubble.
 */
export class MEMWBRegister {
  private value: MEMWBContents | null = null;

  public read(): MEMWBContents | null {
    return this.value;
  }

  public write(value: MEMWBContents | null): void {
    this.value = value;
  }

  public clear(): void {
    this.value = null;
  }

  public reset(): void {
    this.clear();
  }
}
