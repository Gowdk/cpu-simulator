import type {
  MemoryAccessResult,
  RegisterWriteResult,
} from "../../CycleResult";
import type { Instruction } from "../../instructions/Instruction";
import type {
  ForwardingDecision,
} from "./hazards/forwardingUnit";
import type {
  HazardDecision,
} from "./hazards/hazardDetectionUnit";
import type {
  ControlHazardDecision,
} from "./hazards/controlHazardUnit";
import type {
  IFIDContents,
} from "./pipelineRegisters/IFIDRegister";
import type {
  IDEXContents,
} from "./pipelineRegisters/IDEXRegister";
import type {
  EXMEMContents,
} from "./pipelineRegisters/EXMEMRegister";
import type {
  MEMWBContents,
} from "./pipelineRegisters/MEMWBRegister";

export interface PipelineRegisterSnapshot {
  readonly ifId: IFIDContents | null;
  readonly idEx: IDEXContents | null;
  readonly exMem: EXMEMContents | null;
  readonly memWb: MEMWBContents | null;
}

export interface BranchControlTransfer {
  readonly type: "branch";
  readonly instruction: Instruction;
  readonly taken: true;
  readonly targetPc: number;
}

export interface JumpControlTransfer {
  readonly type: "jump";
  readonly instruction: Instruction;
  readonly targetPc: number;
}

export type PipelineControlTransfer =
  | BranchControlTransfer
  | JumpControlTransfer;

export interface PipelinedCycleResult {
  readonly cycleNumber: number;

  readonly pcBefore: number;
  readonly pcAfter: number;

  /**
   * Pipeline state at the beginning of this cycle.
   */
  readonly current: PipelineRegisterSnapshot;

  /**
   * Pipeline state immediately after the simulated clock edge.
   */
  readonly next: PipelineRegisterSnapshot;

  readonly fetchedInstruction: Instruction | null;

  readonly memoryAccess: MemoryAccessResult | null;
  readonly registerWrite: RegisterWriteResult | null;

  /**
   * Forwarding-mux control generated for the instruction occupying EX.
   * null means EX contained a bubble.
   */
  readonly forwarding:
    ForwardingDecision | null;

  /**
   * Pipeline controls produced by the stateless hazard-detection unit.
   */
  readonly hazard: HazardDecision;

  /**
   * Redirect/flush controls produced by the stateless
   * control-hazard unit.
   */
  readonly controlHazard:
    ControlHazardDecision;

  /**
   * Datapath result produced in EX. The target PC remains separate
   * from the control-hazard decision.
   */
  readonly controlTransfer:
    PipelineControlTransfer | null;
}
