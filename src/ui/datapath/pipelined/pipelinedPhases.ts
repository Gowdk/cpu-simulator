export const PIPELINED_PHASES = [
  "PIPELINE",
] as const;

export type PipelinedPhase =
  (typeof PIPELINED_PHASES)[number];

export interface PipelinedPhaseDefinition {
  readonly code: PipelinedPhase;
  readonly label: string;
  readonly description: string;
}

export const PIPELINED_PHASE_DEFINITIONS:
  Readonly<
    Record<
      PipelinedPhase,
      PipelinedPhaseDefinition
    >
  > = {
    PIPELINE: {
      code: "PIPELINE",
      label: "Five-Stage Pipeline",
      description:
        "One hardware clock cycle with IF, ID, EX, MEM, and WB operating concurrently.",
    },
  };
