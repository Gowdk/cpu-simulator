export const PIPELINED_COMPONENT = {
  pc: "pipeline-pc",
  instructionMemory:
    "pipeline-instruction-memory",
  pcPlusFourAdder:
    "pipeline-pc-plus-four-adder",
  nextPcMux:
    "pipeline-next-pc-mux",

  ifIdRegister:
    "pipeline-if-id-register",

  controlUnit:
    "pipeline-control-unit",
  registerFile:
    "pipeline-register-file",
  signExtension:
    "pipeline-sign-extension",
  hazardDetectionUnit:
    "pipeline-hazard-detection-unit",

  idExRegister:
    "pipeline-id-ex-register",

  forwardingUnit:
    "pipeline-forwarding-unit",
  forwardingAMux:
    "pipeline-forwarding-a-mux",
  forwardingBMux:
    "pipeline-forwarding-b-mux",
  aluSrcMux:
    "pipeline-alu-src-mux",
  alu:
    "pipeline-main-alu",

  branchShiftLeftTwo:
    "pipeline-branch-shift-left-two",
  branchTargetAdder:
    "pipeline-branch-target-adder",
  jumpTargetBuilder:
    "pipeline-jump-target-builder",
  controlHazardUnit:
    "pipeline-control-hazard-unit",

  exMemRegister:
    "pipeline-ex-mem-register",

  dataMemory:
    "pipeline-data-memory",
  memToRegMux:
    "pipeline-mem-to-reg-mux",

  memWbRegister:
    "pipeline-mem-wb-register",
} as const;

export type PipelinedComponentId =
  (typeof PIPELINED_COMPONENT)[
    keyof typeof PIPELINED_COMPONENT
  ];

export const PIPELINED_WIRE = {
  pcToInstructionMemory:
    "pipeline-pc-to-instruction-memory",
  pcToPcPlusFourAdder:
    "pipeline-pc-to-pc-plus-four-adder",
  constantFourToPcPlusFourAdder:
    "pipeline-four-to-pc-plus-four-adder",
  pcPlusFourToIfId:
    "pipeline-pc-plus-four-to-if-id",
  instructionMemoryToIfId:
    "pipeline-instruction-memory-to-if-id",
  pcPlusFourToNextPcMux:
    "pipeline-pc-plus-four-to-next-pc-mux",
  nextPcMuxToPc:
    "pipeline-next-pc-mux-to-pc",

  ifIdInstructionToControl:
    "pipeline-if-id-instruction-to-control",
  ifIdRsToRegisterFile:
    "pipeline-if-id-rs-to-register-file",
  ifIdRtToRegisterFile:
    "pipeline-if-id-rt-to-register-file",
  ifIdImmediateToSignExtension:
    "pipeline-if-id-immediate-to-sign-extension",
  ifIdToHazardDetection:
    "pipeline-if-id-to-hazard-detection",

  controlToIdEx:
    "pipeline-control-to-id-ex",
  registerReadOneToIdEx:
    "pipeline-register-read-one-to-id-ex",
  registerReadTwoToIdEx:
    "pipeline-register-read-two-to-id-ex",
  signExtensionToIdEx:
    "pipeline-sign-extension-to-id-ex",

  idExToHazardDetection:
    "pipeline-id-ex-to-hazard-detection",
  hazardToPc:
    "pipeline-hazard-to-pc",
  hazardToIfId:
    "pipeline-hazard-to-if-id",
  hazardToIdEx:
    "pipeline-hazard-to-id-ex",

  idExSourceAToForwardingAMux:
    "pipeline-id-ex-source-a-to-forwarding-a-mux",
  idExSourceBToForwardingBMux:
    "pipeline-id-ex-source-b-to-forwarding-b-mux",
  idExRegistersToForwardingUnit:
    "pipeline-id-ex-registers-to-forwarding-unit",
  exMemDestinationToForwardingUnit:
    "pipeline-ex-mem-destination-to-forwarding-unit",
  memWbDestinationToForwardingUnit:
    "pipeline-mem-wb-destination-to-forwarding-unit",
  forwardingUnitToForwardingAMux:
    "pipeline-forwarding-unit-to-forwarding-a-mux",
  forwardingUnitToForwardingBMux:
    "pipeline-forwarding-unit-to-forwarding-b-mux",

  exMemResultToForwardingAMux:
    "pipeline-ex-mem-result-to-forwarding-a-mux",
  exMemResultToForwardingBMux:
    "pipeline-ex-mem-result-to-forwarding-b-mux",
  memWbValueToForwardingAMux:
    "pipeline-mem-wb-value-to-forwarding-a-mux",
  memWbValueToForwardingBMux:
    "pipeline-mem-wb-value-to-forwarding-b-mux",

  forwardingAMuxToAlu:
    "pipeline-forwarding-a-mux-to-alu",
  forwardingBMuxToAluSrcMux:
    "pipeline-forwarding-b-mux-to-alu-src-mux",
  forwardingBMuxToExMemStore:
    "pipeline-forwarding-b-mux-to-ex-mem-store",
  idExImmediateToAluSrcMux:
    "pipeline-id-ex-immediate-to-alu-src-mux",
  aluSrcMuxToAlu:
    "pipeline-alu-src-mux-to-alu",
  aluToExMem:
    "pipeline-alu-to-ex-mem",

  idExImmediateToBranchShift:
    "pipeline-id-ex-immediate-to-branch-shift",
  branchShiftToBranchTargetAdder:
    "pipeline-branch-shift-to-branch-target-adder",
  idExSequentialPcToBranchTargetAdder:
    "pipeline-id-ex-sequential-pc-to-branch-target-adder",
  branchTargetAdderToControlHazard:
    "pipeline-branch-target-adder-to-control-hazard",
  aluZeroToControlHazard:
    "pipeline-alu-zero-to-control-hazard",

  idExJumpTargetToJumpTargetBuilder:
    "pipeline-id-ex-jump-target-to-jump-target-builder",
  idExSequentialPcToJumpTargetBuilder:
    "pipeline-id-ex-sequential-pc-to-jump-target-builder",
  jumpTargetBuilderToControlHazard:
    "pipeline-jump-target-builder-to-control-hazard",

  controlHazardTargetToNextPcMux:
    "pipeline-control-hazard-target-to-next-pc-mux",
  controlHazardToNextPcMux:
    "pipeline-control-hazard-to-next-pc-mux",
  controlHazardToIfId:
    "pipeline-control-hazard-to-if-id",
  controlHazardToIdEx:
    "pipeline-control-hazard-to-id-ex",

  exMemResultToDataMemory:
    "pipeline-ex-mem-result-to-data-memory",
  exMemStoreToDataMemory:
    "pipeline-ex-mem-store-to-data-memory",
  exMemControlToDataMemory:
    "pipeline-ex-mem-control-to-data-memory",

  exMemResultToMemToRegMux:
    "pipeline-ex-mem-result-to-mem-to-reg-mux",
  dataMemoryToMemToRegMux:
    "pipeline-data-memory-to-mem-to-reg-mux",
  exMemControlToMemToRegMux:
    "pipeline-ex-mem-control-to-mem-to-reg-mux",
  memToRegMuxToMemWb:
    "pipeline-mem-to-reg-mux-to-mem-wb",
  exMemControlToMemWb:
    "pipeline-ex-mem-control-to-mem-wb",

  memWbWriteBackToRegisterFile:
    "pipeline-mem-wb-write-back-to-register-file",
  memWbDestinationToRegisterFile:
    "pipeline-mem-wb-destination-to-register-file",
  memWbRegWriteToRegisterFile:
    "pipeline-mem-wb-reg-write-to-register-file",
} as const;

export type PipelinedWireId =
  (typeof PIPELINED_WIRE)[
    keyof typeof PIPELINED_WIRE
  ];
