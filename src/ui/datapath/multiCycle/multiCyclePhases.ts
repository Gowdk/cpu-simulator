import type {
  MultiCycleState,
} from "../../../domain/cpu/architectures/multiCycle/MultiCycleState";

export type MultiCyclePhase =
  MultiCycleState;

export interface MultiCyclePhaseDefinition {
  readonly code: MultiCyclePhase;
  readonly label: string;
  readonly description: string;
}

export const MULTI_CYCLE_PHASE_DEFINITIONS:
  Readonly<
    Record<
      MultiCyclePhase,
      MultiCyclePhaseDefinition
    >
  > = {
    "instruction-fetch": {
      code: "instruction-fetch",
      label: "Instruction Fetch",
      description:
        "Read the instruction at PC, write it into IR, compute PC + 4, and update the PC.",
    },

    "instruction-decode": {
      code: "instruction-decode",
      label: "Instruction Decode and Register Fetch",
      description:
        "Decode IR, read the register operands into A and B, and precompute the possible branch target in ALUOut.",
    },

    "memory-address": {
      code: "memory-address",
      label: "Memory Address Calculation",
      description:
        "Add the base-register value in A to the sign-extended immediate and store the effective address in ALUOut.",
    },

    "memory-read": {
      code: "memory-read",
      label: "Memory Read",
      description:
        "Use ALUOut as the memory address and capture the loaded word in MDR.",
    },

    "memory-write": {
      code: "memory-write",
      label: "Memory Write",
      description:
        "Use ALUOut as the memory address and store the value held in B.",
    },

    "memory-writeback": {
      code: "memory-writeback",
      label: "Load Write Back",
      description:
        "Select rt as the destination and write the value in MDR into the register file.",
    },

    "r-type-execute": {
      code: "r-type-execute",
      label: "R-Type Execute",
      description:
        "Apply the instruction's ALU operation to A and B and store the result in ALUOut.",
    },

    "r-type-writeback": {
      code: "r-type-writeback",
      label: "R-Type Write Back",
      description:
        "Select rd as the destination and write the ALUOut value into the register file.",
    },

    branch: {
      code: "branch",
      label: "Branch Completion",
      description:
        "Compare A and B. When they are equal, write the branch target previously stored in ALUOut into the PC.",
    },

    jump: {
      code: "jump",
      label: "Jump Completion",
      description:
        "Construct the jump address from the instruction target and the high PC bits, then write it into the PC.",
    },
  };
