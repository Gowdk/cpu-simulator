import type {
  IDEXContents,
} from "../pipelineRegisters/IDEXRegister";

export interface HazardDecision {
  readonly stallPc: boolean;
  readonly stallIfId: boolean;
  readonly bubbleIdEx: boolean;
}

/**
 * Produces only pipeline-control decisions for data hazards.
 *
 * This unit is stateless. PipelinedCpu is responsible for applying
 * the returned decisions to the PC and pipeline registers.
 */
export function detectHazard(
  currentIdEx: IDEXContents | null,
  decodedIfId: IDEXContents | null,
): HazardDecision {
  const loadUseHazard =
    isLoadUseHazard(
      currentIdEx,
      decodedIfId,
    );

  return {
    stallPc: loadUseHazard,
    stallIfId: loadUseHazard,
    bubbleIdEx: loadUseHazard,
  };
}

function isLoadUseHazard(
  currentIdEx: IDEXContents | null,
  decodedIfId: IDEXContents | null,
): boolean {
  if (
    currentIdEx === null ||
    decodedIfId === null
  ) {
    return false;
  }

  /*
   * The only RAW hazard that the current forwarding paths cannot
   * resolve is an instruction immediately following a load.
   *
   * The load's value does not exist until its MEM stage completes,
   * so the following instruction must remain in ID for one cycle.
   */
  if (
    !currentIdEx.controlSignals.memRead ||
    !currentIdEx.controlSignals.regWrite
  ) {
    return false;
  }

  const loadDestination =
    currentIdEx.destinationRegister;

  /*
   * $zero never receives a new architectural value, so it can never
   * create a real dependency.
   */
  if (
    loadDestination === null ||
    loadDestination === 0
  ) {
    return false;
  }

  return (
    decodedIfId.sourceARegister ===
      loadDestination ||
    decodedIfId.sourceBRegister ===
      loadDestination
  );
}
