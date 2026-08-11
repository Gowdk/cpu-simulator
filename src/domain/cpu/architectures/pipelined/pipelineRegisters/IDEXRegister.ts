import type { ControlSignals } from "../../../components/controlUnit";
import type { Instruction } from "../../../instructions/Instruction";

export type IDEXControlSignals = Pick<
  ControlSignals,
  | "aluSrc"
  | "aluOperation"
  | "memRead"
  | "memWrite"
  | "memToReg"
  | "regWrite"
  | "branch"
  | "jump"
>;

export interface IDEXContents {
  readonly instruction: Instruction;

  readonly pc: number;
  readonly sequentialPc: number;

  readonly sourceARegister: number | null;
  readonly sourceBRegister: number | null;

  readonly sourceAValue: number | null;
  readonly sourceBValue: number | null;

  readonly destinationRegister: number | null;
  readonly immediate: number | null;
  readonly jumpTarget: number | null;

  readonly controlSignals: IDEXControlSignals;
}

/**
 * Pipeline register between ID and EX.
 *
 * null represents an empty pipeline slot / bubble.
 */
export class IDEXRegister {
  private value: IDEXContents | null = null;

  public read(): IDEXContents | null {
    return this.value;
  }

  public write(value: IDEXContents | null): void {
    this.value = value;
  }

  public clear(): void {
    this.value = null;
  }

  public reset(): void {
    this.clear();
  }
}
