export const SINGLE_CYCLE_PHASES = [
  "IF",
  "ID",
  "OF",
  "EX",
  "WB",
] as const;

export type SingleCyclePhase =
  (typeof SINGLE_CYCLE_PHASES)[number];

export interface SingleCyclePhaseDefinition {
  readonly code: SingleCyclePhase;
  readonly label: string;
  readonly description: string;
}

export const SINGLE_CYCLE_PHASE_DEFINITIONS:
  Readonly<
    Record<
      SingleCyclePhase,
      SingleCyclePhaseDefinition
    >
  > = {
    IF: {
      code: "IF",
      label: "Instruction Fetch",
      description:
        "Fetch the next instruction from instruction memory.",
    },

    ID: {
      code: "ID",
      label: "Instruction Decode",
      description:
        "Separate the instruction fields and generate the required control signals.",
    },

    OF: {
      code: "OF",
      label: "Operand Fetch",
      description:
        "Read the instruction operands from the register file.",
    },

    EX: {
      code: "EX",
      label: "Instruction Execution",
      description:
        "Execute the instruction, including ALU, memory, branch, or jump work.",
    },

    WB: {
      code: "WB",
      label: "Result Write Back",
      description:
        "Write a computed result back to the register file when required.",
    },
  };
