import type {
  IDEXContents,
} from "../pipelineRegisters/IDEXRegister";
import type {
  EXMEMContents,
} from "../pipelineRegisters/EXMEMRegister";
import type {
  MEMWBContents,
} from "../pipelineRegisters/MEMWBRegister";

export type ForwardingSource =
  | "REGISTER"
  | "EX_MEM"
  | "MEM_WB";

export interface ForwardingDecision {
  readonly forwardA: ForwardingSource;
  readonly forwardB: ForwardingSource;
}

/**
 * Produces only the control decisions for the two forwarding muxes.
 *
 * The unit never selects or returns datapath values. PipelinedCpu uses
 * these decisions to choose the actual forwarded register operands.
 */
export function determineForwarding(
  idEx: IDEXContents,
  exMem: EXMEMContents | null,
  memWb: MEMWBContents | null,
): ForwardingDecision {
  return {
    forwardA: determineSource(
      idEx.sourceARegister,
      exMem,
      memWb,
    ),

    forwardB: determineSource(
      idEx.sourceBRegister,
      exMem,
      memWb,
    ),
  };
}

function determineSource(
  sourceRegister: number | null,
  exMem: EXMEMContents | null,
  memWb: MEMWBContents | null,
): ForwardingSource {
  /*
   * No source register means this operand does not participate in
   * forwarding. $zero is never a valid forwarding destination.
   */
  if (
    sourceRegister === null ||
    sourceRegister === 0
  ) {
    return "REGISTER";
  }

  /*
   * EX/MEM has priority because it contains the newest older
   * instruction.
   */
  const exMemMatches =
    exMem !== null &&
    exMem.controlSignals.regWrite &&
    exMem.destinationRegister !== null &&
    exMem.destinationRegister !== 0 &&
    exMem.destinationRegister ===
      sourceRegister;

  if (exMemMatches) {
    /*
     * A load's EX/MEM ALU result is its effective memory address,
     * not the loaded value. The future hazard-detection unit will
     * stall this load-use case until MEM/WB can provide the data.
     *
     * Importantly, we do not fall through to MEM/WB here: an older
     * MEM/WB value for the same register would be stale.
     */
    return exMem.controlSignals.memRead
      ? "REGISTER"
      : "EX_MEM";
  }

  const memWbMatches =
    memWb !== null &&
    memWb.regWrite &&
    memWb.destinationRegister !== null &&
    memWb.destinationRegister !== 0 &&
    memWb.destinationRegister ===
      sourceRegister;

  if (memWbMatches) {
    return "MEM_WB";
  }

  return "REGISTER";
}
