import type { ControlSignals } from "../../../components/controlUnit";
import type { Instruction } from "../../../instructions/Instruction";

export type EXMEMControlSignals = Pick<
  ControlSignals,
  | "memRead"
  | "memWrite"
  | "memToReg"
  | "regWrite"
>;

export interface EXMEMContents {
  readonly instruction: Instruction;

  readonly aluResult: number | null;

  /**
   * Value carried to MEM for SW.
   */
  readonly storeValue: number | null;

  readonly destinationRegister: number | null;

  readonly controlSignals: EXMEMControlSignals;
}

/**
 * Pipeline register between EX and MEM.
 *
 * null represents an empty pipeline slot / bubble.
 */
export class EXMEMRegister {
  private value: EXMEMContents | null = null;

  public read(): EXMEMContents | null {
    return this.value;
  }

  public write(value: EXMEMContents | null): void {
    this.value = value;
  }

  public clear(): void {
    this.value = null;
  }

  public reset(): void {
    this.clear();
  }
}
