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

const INACTIVE_CONTROL:
  MultiCycleControlSignals = {
    pcWrite: false,
    pcWriteConditional: false,

    memoryRead: false,
    memoryWrite: false,
    instructionRegisterWrite: false,

    iorD: null,

    aluSourceA: null,
    aluSourceB: null,
    aluOperation: null,

    pcSource: null,

    registerWrite: false,
    registerDestination: null,
    registerWriteData: null,
  };

export function generateMultiCycleControl(
  state: MultiCycleState,
  instruction: Instruction | null,
): MultiCycleControlSignals {
  switch (state) {
    case "instruction-fetch":
      return {
        ...INACTIVE_CONTROL,

        pcWrite: true,

        memoryRead: true,
        instructionRegisterWrite: true,
        iorD: "pc",

        aluSourceA: "pc",
        aluSourceB: "constant-four",
        aluOperation: "ADD",

        pcSource: "alu-result",
      };

    case "instruction-decode":
      return {
        ...INACTIVE_CONTROL,

        aluSourceA: "pc",
        aluSourceB: "shifted-immediate",
        aluOperation: "ADD",
      };

    case "memory-address":
      return {
        ...INACTIVE_CONTROL,

        aluSourceA: "a-register",
        aluSourceB:
          "sign-extended-immediate",
        aluOperation: "ADD",
      };

    case "memory-read":
      return {
        ...INACTIVE_CONTROL,

        memoryRead: true,
        iorD: "alu-out",
      };

    case "memory-write":
      return {
        ...INACTIVE_CONTROL,

        memoryWrite: true,
        iorD: "alu-out",
      };

    case "memory-writeback":
      return {
        ...INACTIVE_CONTROL,

        registerWrite: true,
        registerDestination: "rt",
        registerWriteData:
          "memory-data-register",
      };

    case "r-type-execute":
      return {
        ...INACTIVE_CONTROL,

        aluSourceA: "a-register",
        aluSourceB: "b-register",
        aluOperation:
          getRegisterAluOperation(instruction),
      };

    case "r-type-writeback":
      return {
        ...INACTIVE_CONTROL,

        registerWrite: true,
        registerDestination: "rd",
        registerWriteData: "alu-out",
      };

    case "branch":
      return {
        ...INACTIVE_CONTROL,

        pcWriteConditional: true,

        aluSourceA: "a-register",
        aluSourceB: "b-register",
        aluOperation: "SUBTRACT",

        pcSource: "alu-out",
      };

    case "jump":
      return {
        ...INACTIVE_CONTROL,

        pcWrite: true,
        pcSource: "jump-target",
      };
  }
}

function getRegisterAluOperation(
  instruction: Instruction | null,
): AluOperation {
  if (instruction === null) {
    throw new Error(
      "R-type execution requires an instruction in IR.",
    );
  }

  switch (instruction.operation) {
    case "add":
      return "ADD";

    case "sub":
      return "SUBTRACT";

    case "and":
      return "AND";

    case "or":
      return "OR";

    default:
      throw new Error(
        "R-type execution requires add, sub, and, or or.",
      );
  }
}
