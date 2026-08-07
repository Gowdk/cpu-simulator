import type {
  AluOperation,
} from "../../components/alu";
import type {
  Instruction,
} from "../../instructions/Instruction";
import type {
  MultiCycleControlSignals,
} from "./MultiCycleControlSignals";
import type {
  MultiCycleState,
} from "./MultiCycleState";

export interface MultiCycleRegisterReadResult {
  readonly register: number;
  readonly value: number;
}

export interface MultiCycleRegisterWriteResult {
  readonly register: number;
  readonly value: number;
}

export interface MultiCycleAluResult {
  readonly operation: AluOperation;
  readonly inputA: number;
  readonly inputB: number;
  readonly result: number;
  readonly zero: boolean;
}

export interface InstructionMemoryReadResult {
  readonly type: "instruction-read";
  readonly address: number;
  readonly instruction: Instruction;
}

export interface DataMemoryReadResult {
  readonly type: "data-read";
  readonly address: number;
  readonly value: number;
}

export interface DataMemoryWriteResult {
  readonly type: "data-write";
  readonly address: number;
  readonly value: number;
}

export type MultiCycleMemoryAccessResult =
  | InstructionMemoryReadResult
  | DataMemoryReadResult
  | DataMemoryWriteResult;

export interface MultiCycleBranchResult {
  readonly targetPc: number;
  readonly comparisonResult: number;
  readonly taken: boolean;
}

export interface MultiCycleJumpResult {
  readonly instructionIndex: number;
  readonly shiftedIndex: number;
  readonly upperPcBits: number;
  readonly targetPc: number;
}

export interface MultiCycleInternalRegistersSnapshot {
  readonly instructionRegister:
    Instruction | null;

  readonly memoryDataRegister: number;
  readonly aRegister: number;
  readonly bRegister: number;
  readonly aluOutRegister: number;
}

export interface MultiCycleDatapathValues {
  readonly memoryAddress: number | null;

  readonly signExtendedImmediate:
    number | null;

  readonly shiftedImmediate:
    number | null;

  readonly aluInputA: number | null;
  readonly aluInputB: number | null;
  readonly aluResult: number | null;
  readonly aluZero: boolean | null;

  readonly pcCandidate: number | null;
  readonly pcWriteEnabled: boolean;

  readonly jumpTarget: number | null;
}

/**
 * Result of one real multicycle hardware clock cycle.
 */
export interface MultiCycleCycleResult {
  readonly cycleNumber: number;
  readonly instructionNumber: number;

  readonly stateBefore: MultiCycleState;
  readonly stateAfter: MultiCycleState;

  readonly instruction: Instruction;
  readonly assembly: string;

  readonly controlSignals:
    MultiCycleControlSignals;

  readonly pcBefore: number;
  readonly pcAfter: number;

  readonly internalRegisters: {
    readonly before:
      MultiCycleInternalRegistersSnapshot;

    readonly after:
      MultiCycleInternalRegistersSnapshot;
  };

  readonly registerReads: {
    readonly sourceA:
      MultiCycleRegisterReadResult | null;

    readonly sourceB:
      MultiCycleRegisterReadResult | null;
  };

  readonly alu: MultiCycleAluResult | null;

  readonly memoryAccess:
    MultiCycleMemoryAccessResult | null;

  readonly registerWrite:
    MultiCycleRegisterWriteResult | null;

  readonly branch:
    MultiCycleBranchResult | null;

  readonly jump:
    MultiCycleJumpResult | null;

  readonly datapath:
    MultiCycleDatapathValues;

  readonly instructionRetired: boolean;
  readonly retiredInstructionCount: number;
  readonly programComplete: boolean;
}
