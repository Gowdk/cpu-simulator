import type {
  Instruction,
} from "../../instructions/Instruction";
import type {
  MultiCycleState,
} from "./MultiCycleState";

export function getNextMultiCycleState(
  state: MultiCycleState,
  instruction: Instruction | null,
): MultiCycleState {
  switch (state) {
    case "instruction-fetch":
      return "instruction-decode";

    case "instruction-decode":
      return getStateAfterDecode(
        requireInstruction(instruction, state),
      );

    case "memory-address": {
      const currentInstruction =
        requireInstruction(instruction, state);

      switch (currentInstruction.operation) {
        case "lw":
          return "memory-read";

        case "sw":
          return "memory-write";

        default:
          throw new Error(
            "Memory-address state requires lw or sw.",
          );
      }
    }

    case "memory-read":
      return "memory-writeback";

    case "r-type-execute":
      return "r-type-writeback";

    case "memory-write":
    case "memory-writeback":
    case "r-type-writeback":
    case "branch":
    case "jump":
      return "instruction-fetch";
  }
}

function getStateAfterDecode(
  instruction: Instruction,
): MultiCycleState {
  switch (instruction.operation) {
    case "lw":
    case "sw":
      return "memory-address";

    case "add":
    case "sub":
    case "and":
    case "or":
      return "r-type-execute";

    case "beq":
      return "branch";

    case "j":
      return "jump";
  }
}

function requireInstruction(
  instruction: Instruction | null,
  state: MultiCycleState,
): Instruction {
  if (instruction === null) {
    throw new Error(
      `${state} requires an instruction in IR.`,
    );
  }

  return instruction;
}
