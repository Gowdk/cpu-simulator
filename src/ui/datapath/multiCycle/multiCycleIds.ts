export const MULTI_CYCLE_COMPONENT = {
  pc: "pc",
  pcEnableGate: "pc-enable-gate",
  branchAndGate: "branch-and-gate",

  iorDMux: "ior-d-mux",
  memory: "unified-memory",

  instructionRegister:
    "instruction-register",

  memoryDataRegister:
    "memory-data-register",

  controlUnit: "control-unit",

  regDstMux: "reg-dst-mux",
  memToRegMux: "mem-to-reg-mux",
  registerFile: "register-file",

  aRegister: "a-register",
  bRegister: "b-register",

  signExtension: "sign-extension",
  branchShiftLeftTwo:
    "branch-shift-left-two",

  jumpShiftLeftTwo:
    "jump-shift-left-two",

  aluSourceAMux: "alu-source-a-mux",
  aluSourceBMux: "alu-source-b-mux",
  aluControl: "alu-control",
  alu: "main-alu",

  aluOutRegister:
    "alu-out-register",

  pcSourceMux: "pc-source-mux",
} as const;

export type MultiCycleComponentId =
  (typeof MULTI_CYCLE_COMPONENT)[
    keyof typeof MULTI_CYCLE_COMPONENT
  ];

export const MULTI_CYCLE_WIRE = {
  pcToIorDMux: "pc-to-ior-d-mux",
  iorDMuxToMemory: "ior-d-mux-to-memory",
  aluOutToIorDMux: "alu-out-to-ior-d-mux",

  memoryToInstructionRegister:
    "memory-to-instruction-register",

  memoryToMemoryDataRegister:
    "memory-to-memory-data-register",

  bRegisterToMemory:
    "b-register-to-memory",

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

  regDstMuxToRegisterFile:
    "reg-dst-mux-to-register-file",

  registerReadOneToARegister:
    "register-read-one-to-a-register",

  registerReadTwoToBRegister:
    "register-read-two-to-b-register",

  memoryDataRegisterToMemToRegMux:
    "memory-data-register-to-mem-to-reg-mux",

  aluOutToMemToRegMux:
    "alu-out-to-mem-to-reg-mux",

  memToRegMuxToRegisterFile:
    "mem-to-reg-mux-to-register-file",

  pcToAluSourceAMux:
    "pc-to-alu-source-a-mux",

  aRegisterToAluSourceAMux:
    "a-register-to-alu-source-a-mux",

  aluSourceAMuxToAlu:
    "alu-source-a-mux-to-alu",

  bRegisterToAluSourceBMux:
    "b-register-to-alu-source-b-mux",

  constantFourToAluSourceBMux:
    "constant-four-to-alu-source-b-mux",

  instructionImmediateToSignExtension:
    "instruction-immediate-to-sign-extension",

  signExtensionToAluSourceBMux:
    "sign-extension-to-alu-source-b-mux",

  signExtensionToBranchShift:
    "sign-extension-to-branch-shift",

  branchShiftToAluSourceBMux:
    "branch-shift-to-alu-source-b-mux",

  aluSourceBMuxToAlu:
    "alu-source-b-mux-to-alu",

  instructionFunctToAluControl:
    "instruction-funct-to-alu-control",

  controlToAluControl:
    "control-to-alu-control",

  aluControlToAlu:
    "alu-control-to-alu",

  aluToAluOutRegister:
    "alu-to-alu-out-register",

  aluZeroToBranchAndGate:
    "alu-zero-to-branch-and-gate",

  controlPcWriteCondToBranchAndGate:
    "control-pc-write-cond-to-branch-and-gate",

  branchAndGateToPcEnableGate:
    "branch-and-gate-to-pc-enable-gate",

  controlPcWriteToPcEnableGate:
    "control-pc-write-to-pc-enable-gate",

  pcEnableGateToPc:
    "pc-enable-gate-to-pc",

  aluResultToPcSourceMux:
    "alu-result-to-pc-source-mux",

  aluOutToPcSourceMux:
    "alu-out-to-pc-source-mux",

  instructionJumpToJumpShift:
    "instruction-jump-to-jump-shift",

  jumpShiftToPcSourceMux:
    "jump-shift-to-pc-source-mux",

  pcHighBitsToPcSourceMux:
    "pc-high-bits-to-pc-source-mux",

  pcSourceMuxToPc:
    "pc-source-mux-to-pc",

  controlToIorDMux:
    "control-to-ior-d-mux",

  controlToMemoryRead:
    "control-to-memory-read",

  controlToMemoryWrite:
    "control-to-memory-write",

  controlToInstructionRegisterWrite:
    "control-to-instruction-register-write",

  controlToRegDstMux:
    "control-to-reg-dst-mux",

  controlToMemToRegMux:
    "control-to-mem-to-reg-mux",

  controlToRegisterWrite:
    "control-to-register-write",

  controlToAluSourceAMux:
    "control-to-alu-source-a-mux",

  controlToAluSourceBMux:
    "control-to-alu-source-b-mux",

  controlToPcSourceMux:
    "control-to-pc-source-mux",
} as const;

export type MultiCycleWireId =
  (typeof MULTI_CYCLE_WIRE)[
    keyof typeof MULTI_CYCLE_WIRE
  ];
