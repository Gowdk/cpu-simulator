/*
  CycleResult is passed over to the UI layer where it is used to
  build the diagram dependent on the instruction executed.
*/
import type { AluOperation } from "./components/alu";
import type { ControlSignals } from "./components/controlUnit";
import type { Instruction } from "./instructions/Instruction";

export interface MemoryReadResult {
  readonly type: "read";
  readonly address: number;
  readonly value: number;
}

export interface MemoryWriteResult {
  readonly type: "write";
  readonly address: number;
  readonly value: number;
}

export type MemoryAccessResult =
  | MemoryReadResult
  | MemoryWriteResult;

export interface RegisterReadResult {
  readonly register: number;
  readonly value: number;
}

export interface RegisterWriteResult {
  readonly register: number;
  readonly value: number;
}

export interface AluCycleResult {
  readonly operation: AluOperation;
  readonly inputA: number;
  readonly inputB: number;
  readonly result: number;
  readonly zero: boolean;
}

export type DatapathComponent =
  | "pc"
  | "instructionMemory"
  | "controlUnit"
  | "registerFile"
  | "alu"
  | "dataMemory"
  | "writeBack";

export type DatapathConnection =
  | "pcToInstructionMemory"
  | "instructionMemoryToControl"
  | "instructionMemoryToRegisters"
  | "registersToAlu"
  | "aluToDataMemory"
  | "aluToWriteBack"
  | "memoryToWriteBack";

export interface DatapathActivity {
  readonly components:
    readonly DatapathComponent[];

  readonly connections:
    readonly DatapathConnection[];
}

export interface BranchResult {
  /**
   * Output of the PC + 4 adder.
   */
  readonly sequentialPc: number;

  /**
   * Immediate field from the instruction.
   */
  readonly immediate: number;

  /**
   * Output of the sign-extension component.
   */
  readonly signExtendedImmediate: number;

  /**
   * Output of the shift-left-two component.
   */
  readonly shiftedOffset: number;

  /**
   * Output of the branch-target adder.
   */
  readonly targetPc: number;

  /**
   * Output of Branch AND Zero.
   */
  readonly taken: boolean;
}

export interface JumpResult {
  readonly sequentialPc: number;
  readonly instructionIndex: number;
  readonly shiftedIndex: number;
  readonly upperPcBits: number;
  readonly targetPc: number;
}

export interface CycleResult {
  readonly cycleNumber: number;

  readonly pcBefore: number;
  readonly pcAfter: number;

  readonly instruction: Instruction;
  readonly assembly: string;

  readonly controlSignals: ControlSignals;

  readonly registerReads: {
    readonly sourceA: RegisterReadResult | null;
    readonly sourceB: RegisterReadResult | null;
  };

  readonly alu: AluCycleResult | null;

  readonly memoryAccess:
    MemoryAccessResult | null;

  readonly branch: BranchResult | null;

  readonly jump: JumpResult | null;

  readonly registerWrite:
    RegisterWriteResult | null;
  
}