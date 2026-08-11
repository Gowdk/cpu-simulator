import type {
  PipelineControlTransfer,
} from "../PipelinedCycleResult";

export interface ControlHazardDecision {
  readonly redirectPc: boolean;
  readonly flushIfId: boolean;
  readonly flushIdEx: boolean;
}

/**
 * Produces only pipeline-control decisions for control hazards.
 *
 * EX determines whether a control transfer occurs and calculates the
 * target PC. This stateless unit only determines how the younger
 * pipeline state must respond.
 */
export function resolveControlHazard(
  controlTransfer:
    PipelineControlTransfer | null,
): ControlHazardDecision {
  const redirect =
    controlTransfer !== null;

  return {
    redirectPc: redirect,
    flushIfId: redirect,
    flushIdEx: redirect,
  };
}
