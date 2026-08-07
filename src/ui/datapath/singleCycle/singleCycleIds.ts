export const SINGLE_CYCLE_COMPONENT = {
  pc: "pc",
  instructionMemory: "instruction-memory",
  pcPlusFourAdder: "pc-plus-four-adder",
  jumpShiftLeftTwo: "jump-shift-left-two",
  controlUnit: "control-unit",
  regDstMux: "reg-dst-mux",
  registerFile: "register-file",
  signExtension: "sign-extension",
  aluControl: "alu-control",
  aluSrcMux: "alu-src-mux",
  alu: "main-alu",
  branchShiftLeftTwo: "branch-shift-left-two",
  branchTargetAdder: "branch-target-adder",
  branchAndGate: "branch-and-gate",
  dataMemory: "data-memory",
  memToRegMux: "mem-to-reg-mux",
  pcSrcMux: "pc-src-mux",
  jumpMux: "jump-mux",
} as const;

export type SingleCycleComponentId =
  (typeof SINGLE_CYCLE_COMPONENT)[
    keyof typeof SINGLE_CYCLE_COMPONENT
  ];

export const SINGLE_CYCLE_WIRE = {
  pcToInstructionMemory:
    "pc-to-instruction-memory",

  pcToPcPlusFourAdder:
    "pc-to-pc-plus-four-adder",

  constantFourToPcPlusFourAdder:
    "constant-four-to-pc-plus-four-adder",

  pcPlusFourToBranchTargetAdder:
    "pc-plus-four-to-branch-target-adder",

  pcPlusFourToPcSrcMux:
    "pc-plus-four-to-pc-src-mux",

  instructionToControlUnit:
    "instruction-to-control-unit",

  instructionRsToRegisterFile:
    "instruction-rs-to-register-file",

  instructionRtToRegisterFile:
    "instruction-rt-to-register-file",

  instructionRtToRegDstMux:
    "instruction-rt-to-reg-dst-mux",

  instructionRdToRegDstMux:
    "instruction-rd-to-reg-dst-mux",

  regDstMuxToRegisterWriteAddress:
    "reg-dst-mux-to-register-write-address",

  instructionImmediateToSignExtension:
    "instruction-immediate-to-sign-extension",

  instructionFunctToAluControl:
    "instruction-funct-to-alu-control",

  instructionJumpFieldToJumpShift:
    "instruction-jump-field-to-jump-shift",

  jumpShiftToJumpMux:
    "jump-shift-to-jump-mux",
  
  jumpShiftToJumpMux1:
    "jump-shift-to-jump-mux1",
  
  jumpShiftToJumpMux2:
    "jump-shift-to-jump-mux2",

  pcHighBitsToJumpMux:
    "pc-high-bits-to-jump-mux",

  controlToRegDstMux:
    "control-to-reg-dst-mux",

  controlToJumpMux:
    "control-to-jump-mux",

  controlToBranchAndGate:
    "control-to-branch-and-gate",

  controlToMemoryRead:
    "control-to-memory-read",

  controlToMemToRegMux:
    "control-to-mem-to-reg-mux",

  controlToAluControl:
    "control-to-alu-control",

  controlToMemoryWrite:
    "control-to-memory-write",

  controlToAluSrcMux:
    "control-to-alu-src-mux",

  controlToRegisterWrite:
    "control-to-register-write",

  registerReadDataOneToAlu:
    "register-read-data-one-to-alu",

  registerReadDataTwoToAluSrcMux:
    "register-read-data-two-to-alu-src-mux",

  registerReadDataTwoToDataMemory:
    "register-read-data-two-to-data-memory",

  signExtensionToAluSrcMux:
    "sign-extension-to-alu-src-mux",

  signExtensionToBranchShift:
    "sign-extension-to-branch-shift",

  branchShiftToBranchTargetAdder:
    "branch-shift-to-branch-target-adder",

  aluSrcMuxToAlu:
    "alu-src-mux-to-alu",

  aluControlToAlu:
    "alu-control-to-alu",

  aluZeroToBranchAndGate:
    "alu-zero-to-branch-and-gate",

  aluResultToDataMemory:
    "alu-result-to-data-memory",

  aluResultToMemToRegMux:
    "alu-result-to-mem-to-reg-mux",

  dataMemoryToMemToRegMux:
    "data-memory-to-mem-to-reg-mux",

  memToRegMuxToRegisterWriteData:
    "mem-to-reg-mux-to-register-write-data",

  branchTargetAdderToPcSrcMux:
    "branch-target-adder-to-pc-src-mux",

  branchAndGateToPcSrcMux:
    "branch-and-gate-to-pc-src-mux",

  pcSrcMuxToJumpMux:
    "pc-src-mux-to-jump-mux",

  jumpMuxToPc:
    "jump-mux-to-pc",
} as const;

export type SingleCycleWireId =
  (typeof SINGLE_CYCLE_WIRE)[
    keyof typeof SINGLE_CYCLE_WIRE
  ];
