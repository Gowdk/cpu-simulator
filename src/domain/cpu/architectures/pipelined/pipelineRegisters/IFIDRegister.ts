import type { Instruction } from "../../../instructions/Instruction";

export interface IFIDContents {
  readonly pc: number;
  readonly sequentialPc: number;
  readonly instruction: Instruction;
}

/**
 * Pipeline register between IF and ID.
 *
 * null represents an empty pipeline slot / bubble.
 */
export class IFIDRegister {
  private value: IFIDContents | null = null;

  public read(): IFIDContents | null {
    return this.value;
  }

  public write(value: IFIDContents | null): void {
    this.value = value;
  }

  public clear(): void {
    this.value = null;
  }

  public reset(): void {
    this.clear();
  }
}
