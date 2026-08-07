import type {
  MultiCycleCycleResult,
} from "../../../domain/cpu/architectures/multiCycle/MultiCycleCycleResult";
import type {
  DatapathFrame,
} from "../core/types";
import {
  MULTI_CYCLE_COMPONENT as C,
  MULTI_CYCLE_WIRE as W,
  type MultiCycleComponentId,
  type MultiCycleWireId,
} from "./multiCycleIds";
import {
  MULTI_CYCLE_PHASE_DEFINITIONS,
  type MultiCyclePhase,
} from "./multiCyclePhases";

export type MultiCycleFrame =
  DatapathFrame<
    MultiCyclePhase,
    MultiCycleComponentId,
    MultiCycleWireId
  >;

/**
 * Converts one real multicycle hardware clock cycle into one
 * visualization frame.
 */
export function buildMultiCycleFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  switch (cycle.stateBefore) {
    case "instruction-fetch":
      return buildInstructionFetchFrame(cycle);

    case "instruction-decode":
      return buildInstructionDecodeFrame(cycle);

    case "memory-address":
      return buildMemoryAddressFrame(cycle);

    case "memory-read":
      return buildMemoryReadFrame(cycle);

    case "memory-write":
      return buildMemoryWriteFrame(cycle);

    case "memory-writeback":
      return buildMemoryWriteBackFrame(cycle);

    case "r-type-execute":
      return buildRegisterExecuteFrame(cycle);

    case "r-type-writeback":
      return buildRegisterWriteBackFrame(cycle);

    case "branch":
      return buildBranchFrame(cycle);

    case "jump":
      return buildJumpFrame(cycle);
  }
}

function buildInstructionFetchFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const alu = requireAlu(cycle);
  const access = cycle.memoryAccess;

  if (
    access === null ||
    access.type !== "instruction-read"
  ) {
    throw new Error(
      "Instruction fetch requires an instruction-memory read.",
    );
  }

  return createFrame(
    cycle,
    [
      C.pc,
      C.iorDMux,
      C.memory,
      C.instructionRegister,
      C.aluSourceAMux,
      C.aluSourceBMux,
      C.alu,
      C.aluOutRegister,
      C.pcSourceMux,
      C.pcEnableGate,
    ],
    [
      W.pcToIorDMux,
      W.iorDMuxToMemory,
      W.memoryToInstructionRegister,
      W.pcToAluSourceAMux,
      W.constantFourToAluSourceBMux,
      W.aluSourceAMuxToAlu,
      W.aluSourceBMuxToAlu,
      W.aluToAluOutRegister,
      W.aluResultToPcSourceMux,
      W.pcSourceMuxToPc,
      W.controlToIorDMux,
      W.controlToMemoryRead,
      W.controlToInstructionRegisterWrite,
      W.controlToAluSourceAMux,
      W.controlToAluSourceBMux,
      W.controlToPcSourceMux,
      W.controlPcWriteToPcEnableGate,
      W.pcEnableGateToPc,
    ],
    {
      [C.pc]:
        `PC: ${cycle.pcBefore} → ${cycle.pcAfter}`,

      [C.memory]:
        `Mem[${access.address}] = ${cycle.assembly}`,

      [C.instructionRegister]:
        `IR ← ${cycle.assembly}`,

      [C.alu]:
        `${alu.inputA} + ${alu.inputB} = ${alu.result}`,

      [C.aluOutRegister]:
        `ALUOut ← ${cycle.internalRegisters.after.aluOutRegister}`,

      [C.pcSourceMux]:
        `select ALU result ${cycle.datapath.pcCandidate}`,
    },
    [
      "IorD selects the PC as the shared-memory address.",
      "IRWrite captures the fetched instruction.",
      "The shared ALU computes PC + 4, and PCWrite commits it during this clock cycle.",
    ],
  );
}

function buildInstructionDecodeFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const alu = requireAlu(cycle);
  const sourceA = cycle.registerReads.sourceA;
  const sourceB = cycle.registerReads.sourceB;

  /*
   * A jump instruction has no rs or rt operands. The domain layer
   * therefore returns null for both register reads. Keep the generic
   * decode-state ALU path visible, but do not highlight the Register
   * File, A, B, or their wires when no source registers are used.
   */
  const readsSourceRegisters =
    sourceA !== null || sourceB !== null;

  const registerValues = [
    sourceA === null
      ? null
      : `$${sourceA.register} = ${sourceA.value}`,

    sourceB === null
      ? null
      : `$${sourceB.register} = ${sourceB.value}`,
  ].filter((value): value is string =>
    value !== null,
  );

  const activeComponents:
    MultiCycleComponentId[] = [
      C.instructionRegister,
      C.controlUnit,
      C.signExtension,
      C.branchShiftLeftTwo,
      C.aluSourceAMux,
      C.aluSourceBMux,
      C.alu,
      C.aluOutRegister,
    ];

  const activeWires: MultiCycleWireId[] = [
    W.instructionToControlUnit,
    W.instructionImmediateToSignExtension,
    W.signExtensionToBranchShift,
    W.branchShiftToAluSourceBMux,
    W.pcToAluSourceAMux,
    W.aluSourceAMuxToAlu,
    W.aluSourceBMuxToAlu,
    W.aluToAluOutRegister,
    W.controlToAluSourceAMux,
    W.controlToAluSourceBMux,
  ];

  if (readsSourceRegisters) {
    activeComponents.push(
      C.registerFile,
      C.aRegister,
      C.bRegister,
    );
  }

  if (sourceA !== null) {
    activeWires.push(
      W.instructionRsToRegisterFile,
      W.registerReadOneToARegister,
    );
  }

  if (sourceB !== null) {
    activeWires.push(
      W.instructionRtToRegisterFile,
      W.registerReadTwoToBRegister,
    );
  }

  return createFrame(
    cycle,
    activeComponents,
    activeWires,
    {
      [C.instructionRegister]:
        cycle.assembly,

      ...(readsSourceRegisters
        ? {
            [C.registerFile]:
              registerValues.join(", "),

            [C.aRegister]:
              `A ← ${cycle.internalRegisters.after.aRegister}`,

            [C.bRegister]:
              `B ← ${cycle.internalRegisters.after.bRegister}`,
          }
        : {}),

      [C.signExtension]:
        cycle.datapath.signExtendedImmediate === null
          ? "No immediate field"
          : `imm = ${cycle.datapath.signExtendedImmediate}`,

      [C.branchShiftLeftTwo]:
        cycle.datapath.shiftedImmediate === null
          ? "offset = 0"
          : `offset = ${cycle.datapath.shiftedImmediate}`,

      [C.alu]:
        `${alu.inputA} + ${alu.inputB} = ${alu.result}`,

      [C.aluOutRegister]:
        `possible branch target = ${cycle.internalRegisters.after.aluOutRegister}`,
    },
    readsSourceRegisters
      ? [
          "A and B capture the register-file outputs at the end of the cycle.",
          "The ALU simultaneously computes the possible branch target from the already-incremented PC.",
        ]
      : [
          "This instruction has no source-register operands, so the Register File, A, and B remain inactive.",
          "The shared decode state still performs its generic possible-branch-target calculation.",
        ],
  );
}

function buildMemoryAddressFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const alu = requireAlu(cycle);

  return createFrame(
    cycle,
    [
      C.instructionRegister,
      C.aRegister,
      C.signExtension,
      C.aluSourceAMux,
      C.aluSourceBMux,
      C.alu,
      C.aluOutRegister,
    ],
    [
      W.aRegisterToAluSourceAMux,
      W.instructionImmediateToSignExtension,
      W.signExtensionToAluSourceBMux,
      W.aluSourceAMuxToAlu,
      W.aluSourceBMuxToAlu,
      W.aluToAluOutRegister,
      W.controlToAluSourceAMux,
      W.controlToAluSourceBMux,
    ],
    {
      [C.aRegister]:
        `base = ${cycle.internalRegisters.before.aRegister}`,

      [C.signExtension]:
        `offset = ${cycle.datapath.signExtendedImmediate}`,

      [C.alu]:
        `${alu.inputA} + ${alu.inputB} = ${alu.result}`,

      [C.aluOutRegister]:
        `effective address = ${cycle.internalRegisters.after.aluOutRegister}`,
    },
    [
      "ALUSrcA selects A, and ALUSrcB selects the sign-extended immediate.",
      "The effective address is retained in ALUOut for the following memory cycle.",
    ],
  );
}

function buildMemoryReadFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const access = cycle.memoryAccess;

  if (
    access === null ||
    access.type !== "data-read"
  ) {
    throw new Error(
      "Memory-read state requires a data-memory read.",
    );
  }

  return createFrame(
    cycle,
    [
      C.aluOutRegister,
      C.iorDMux,
      C.memory,
      C.memoryDataRegister,
    ],
    [
      W.aluOutToIorDMux,
      W.iorDMuxToMemory,
      W.memoryToMemoryDataRegister,
      W.controlToIorDMux,
      W.controlToMemoryRead,
    ],
    {
      [C.aluOutRegister]:
        `address = ${cycle.internalRegisters.before.aluOutRegister}`,

      [C.memory]:
        `Mem[${access.address}] = ${access.value}`,

      [C.memoryDataRegister]:
        `MDR ← ${cycle.internalRegisters.after.memoryDataRegister}`,
    },
    [
      "IorD selects ALUOut instead of the PC.",
      "The loaded word is retained in MDR until the write-back cycle.",
    ],
  );
}

function buildMemoryWriteFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const access = cycle.memoryAccess;

  if (
    access === null ||
    access.type !== "data-write"
  ) {
    throw new Error(
      "Memory-write state requires a data-memory write.",
    );
  }

  return createFrame(
    cycle,
    [
      C.aluOutRegister,
      C.bRegister,
      C.iorDMux,
      C.memory,
    ],
    [
      W.aluOutToIorDMux,
      W.iorDMuxToMemory,
      W.bRegisterToMemory,
      W.controlToIorDMux,
      W.controlToMemoryWrite,
    ],
    {
      [C.aluOutRegister]:
        `address = ${access.address}`,

      [C.bRegister]:
        `write data = ${access.value}`,

      [C.memory]:
        `Mem[${access.address}] ← ${access.value}`,
    },
    [
      "The store completes when MemWrite commits B to the address held in ALUOut.",
    ],
  );
}

function buildMemoryWriteBackFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const write = requireRegisterWrite(cycle);

  return createFrame(
    cycle,
    [
      C.instructionRegister,
      C.regDstMux,
      C.memoryDataRegister,
      C.memToRegMux,
      C.registerFile,
    ],
    [
      W.instructionRtToRegDstMux,
      W.regDstMuxToRegisterFile,
      W.memoryDataRegisterToMemToRegMux,
      W.memToRegMuxToRegisterFile,
      W.controlToRegDstMux,
      W.controlToMemToRegMux,
      W.controlToRegisterWrite,
    ],
    {
      [C.regDstMux]:
        `destination = $${write.register}`,

      [C.memoryDataRegister]:
        `MDR = ${cycle.internalRegisters.before.memoryDataRegister}`,

      [C.memToRegMux]:
        `selected value = ${write.value}`,

      [C.registerFile]:
        `$${write.register} ← ${write.value}`,
    },
    [
      "RegDst selects rt, and MemToReg selects MDR.",
      "This cycle retires the load instruction.",
    ],
  );
}

function buildRegisterExecuteFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const alu = requireAlu(cycle);

  return createFrame(
    cycle,
    [
      C.instructionRegister,
      C.aRegister,
      C.bRegister,
      C.aluSourceAMux,
      C.aluSourceBMux,
      C.aluControl,
      C.alu,
      C.aluOutRegister,
    ],
    [
      W.aRegisterToAluSourceAMux,
      W.bRegisterToAluSourceBMux,
      W.instructionFunctToAluControl,
      W.controlToAluControl,
      W.aluControlToAlu,
      W.controlToAluSourceAMux,
      W.controlToAluSourceBMux,
      W.aluSourceAMuxToAlu,
      W.aluSourceBMuxToAlu,
      W.aluToAluOutRegister,
    ],
    {
      [C.aRegister]:
        `A = ${cycle.internalRegisters.before.aRegister}`,

      [C.bRegister]:
        `B = ${cycle.internalRegisters.before.bRegister}`,

      [C.aluControl]:
        `operation = ${alu.operation}`,

      [C.alu]:
        `${alu.inputA} ${formatAluOperation(alu.operation)} ${alu.inputB} = ${alu.result}`,

      [C.aluOutRegister]:
        `ALUOut ← ${cycle.internalRegisters.after.aluOutRegister}`,
    },
    [
      "The shared ALU performs the R-type operation only during this cycle.",
      "The result is retained in ALUOut for the next write-back cycle.",
    ],
  );
}

function buildRegisterWriteBackFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const write = requireRegisterWrite(cycle);

  return createFrame(
    cycle,
    [
      C.instructionRegister,
      C.regDstMux,
      C.aluOutRegister,
      C.memToRegMux,
      C.registerFile,
    ],
    [
      W.instructionRdToRegDstMux,
      W.regDstMuxToRegisterFile,
      W.aluOutToMemToRegMux,
      W.memToRegMuxToRegisterFile,
      W.controlToRegDstMux,
      W.controlToMemToRegMux,
      W.controlToRegisterWrite,
    ],
    {
      [C.regDstMux]:
        `destination = $${write.register}`,

      [C.aluOutRegister]:
        `ALUOut = ${cycle.internalRegisters.before.aluOutRegister}`,

      [C.memToRegMux]:
        `selected value = ${write.value}`,

      [C.registerFile]:
        `$${write.register} ← ${write.value}`,
    },
    [
      "RegDst selects rd, and MemToReg selects ALUOut.",
      "This cycle retires the R-type instruction.",
    ],
  );
}

function buildBranchFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const alu = requireAlu(cycle);
  const branch = cycle.branch;

  if (branch === null) {
    throw new Error(
      "Branch state requires branch information.",
    );
  }

  const activeWires: MultiCycleWireId[] = [
  W.aRegisterToAluSourceAMux,
  W.bRegisterToAluSourceBMux,
  W.aluSourceAMuxToAlu,
  W.aluSourceBMuxToAlu,
  W.controlPcWriteCondToBranchAndGate,

  // Do not include this unconditionally:
  // W.branchAndGateToPcEnableGate,

  W.controlToAluSourceAMux,
  W.controlToAluSourceBMux,

  W.aluOutToPcSourceMux,
];

if (branch.taken) {
  activeWires.push(
    /*
     * ANDOut = 1, so the wire carrying the AND
     * gate output becomes active.
     */
    W.branchAndGateToPcEnableGate,

    W.aluOutToPcSourceMux,
    W.aluZeroToBranchAndGate,
    W.controlToPcSourceMux,
    W.pcSourceMuxToPc,
    W.pcEnableGateToPc,
    
  );
}

  return createFrame(
    cycle,
    [
      C.aRegister,
      C.bRegister,
      C.aluSourceAMux,
      C.aluSourceBMux,
      C.alu,
      C.aluOutRegister,
      C.branchAndGate,
      C.pcEnableGate,
      C.pcSourceMux,
      C.pc,
    ],
    activeWires,
    {
      [C.alu]:
        `${alu.inputA} - ${alu.inputB} = ${alu.result}`,

      [C.aluOutRegister]:
        `branch target = ${branch.targetPc}`,

      [C.branchAndGate]:
        `PCWriteCond ∧ Zero = ${branch.taken ? 1 : 0}`,

      [C.pc]:
        branch.taken
          ? `PC ← ${cycle.pcAfter}`
          : `PC remains ${cycle.pcAfter}`,
    },
    [
      branch.taken
        ? "The operands are equal, so PCWriteCond enables the PC and PCSource selects the target in ALUOut."
        : "The operands are not equal, so the PC write is disabled.",
      "This cycle retires the branch instruction.",
    ],
  );
}

function buildJumpFrame(
  cycle: MultiCycleCycleResult,
): MultiCycleFrame {
  const jump = cycle.jump;

  if (jump === null) {
    throw new Error(
      "Jump state requires jump-target information.",
    );
  }

  return createFrame(
    cycle,
    [
      C.instructionRegister,
      C.jumpShiftLeftTwo,
      C.pcSourceMux,
      C.pcEnableGate,
      C.pc,
    ],
    [
      W.instructionJumpToJumpShift,
      W.jumpShiftToPcSourceMux,
      W.pcHighBitsToPcSourceMux,
      W.controlToPcSourceMux,
      W.controlPcWriteToPcEnableGate,
      W.pcEnableGateToPc,
      W.pcSourceMuxToPc,
    ],
    {
      [C.jumpShiftLeftTwo]:
        `${jump.instructionIndex} << 2 = ${jump.shiftedIndex}`,

      [C.pcSourceMux]:
        `jump target = ${jump.targetPc}`,

      [C.pc]:
        `PC ← ${cycle.pcAfter}`,
    },
    [
      `The high PC bits (${jump.upperPcBits >>> 0}) merge with the shifted 26-bit target.`,
      "PCWrite is asserted unconditionally, and PCSource selects the jump input.",
      "This cycle retires the jump instruction.",
    ],
  );
}

function createFrame(
  cycle: MultiCycleCycleResult,
  activeComponentIds:
    readonly MultiCycleComponentId[],
  activeWireIds:
    readonly MultiCycleWireId[],
  values: MultiCycleFrame["values"],
  notes: readonly string[],
): MultiCycleFrame {
  const phase = cycle.stateBefore;

  const definition =
    MULTI_CYCLE_PHASE_DEFINITIONS[phase];

  /*
   * AND output:
   *
   * PCWriteCond AND Zero
   */
  const branchAndOutputHigh =
    cycle.controlSignals.pcWriteConditional &&
    cycle.datapath.aluZero === true;

  /*
   * OR output:
   *
   * PCWrite OR (PCWriteCond AND Zero)
   *
   * The domain layer has already calculated this value.
   */
  const pcEnableOutputHigh =
    cycle.datapath.pcWriteEnabled;

  const highlightedComponentIds =
    activeComponentIds.filter(
      componentId => {
        switch (componentId) {
          case C.branchAndGate:
            return branchAndOutputHigh;

          case C.pcEnableGate:
            return pcEnableOutputHigh;

          default:
            return true;
        }
      },
    );

  return {
    phase,
    phaseLabel: definition.label,
    cycleNumber: cycle.cycleNumber,
    assembly: cycle.assembly,
    description: definition.description,

    activeComponentIds:
      highlightedComponentIds,

    activeWireIds,

    values: {
      ...buildControlWireValues(
        cycle,
        activeWireIds,
      ),

      ...values,
    },

    notes,
  };
}

/*
 * Numeric values correspond to the numbered inputs shown on
 * the multicycle datapath muxes. The domain layer deliberately
 * uses descriptive strings; this presentation layer translates
 * those selections into the diagram's visible control values.
 */
const IOR_D_PORT = {
  pc: 0,
  "alu-out": 1,
} as const;

const ALU_SOURCE_A_PORT = {
  pc: 0,
  "a-register": 1,
} as const;

const ALU_SOURCE_B_PORT = {
  "b-register": 0,
  "constant-four": 1,
  "sign-extended-immediate": 2,
  "shifted-immediate": 3,
} as const;

const PC_SOURCE_PORT = {
  "alu-result": 0,
  "alu-out": 1,
  "jump-target": 2,
} as const;

const REGISTER_DESTINATION_PORT = {
  rt: 0,
  rd: 1,
} as const;

const REGISTER_WRITE_DATA_PORT = {
  "alu-out": 0,
  "memory-data-register": 1,
} as const;

/**
 * Produces labels only for control wires participating in the
 * current frame. For example, instruction fetch displays
 * "IorD = 0", while a load/store memory cycle displays
 * "IorD = 1".
 */
function buildControlWireValues(
  cycle: MultiCycleCycleResult,
  activeWireIds: readonly MultiCycleWireId[],
): MultiCycleFrame["values"] {
  const activeWires =
    new Set<MultiCycleWireId>(
      activeWireIds,
    );

  const values:
    Partial<
      Record<MultiCycleWireId, string>
    > = {};

  const setValue = (
    wireId: MultiCycleWireId,
    value: string | null,
  ): void => {
    if (
      activeWires.has(wireId) &&
      value !== null
    ) {
      values[wireId] = value;
    }
  };

  const control = cycle.controlSignals;

  setValue(
    W.controlToIorDMux,
    control.iorD === null
      ? null
      : `IorD = ${IOR_D_PORT[control.iorD]}`,
  );

  setValue(
    W.controlToMemoryRead,
    `MemRead = ${booleanToBit(
      control.memoryRead,
    )}`,
  );

  setValue(
    W.controlToMemoryWrite,
    `MemWrite = ${booleanToBit(
      control.memoryWrite,
    )}`,
  );

  setValue(
    W.controlToInstructionRegisterWrite,
    `IRWrite = ${booleanToBit(
      control.instructionRegisterWrite,
    )}`,
  );

  setValue(
    W.controlToRegDstMux,
    control.registerDestination === null
      ? null
      : `RegDst = ${
          REGISTER_DESTINATION_PORT[
            control.registerDestination
          ]
        }`,
  );

  setValue(
    W.controlToMemToRegMux,
    control.registerWriteData === null
      ? null
      : `MemToReg = ${
          REGISTER_WRITE_DATA_PORT[
            control.registerWriteData
          ]
        }`,
  );

  setValue(
    W.controlToRegisterWrite,
    `RegWrite = ${booleanToBit(
      control.registerWrite,
    )}`,
  );

  setValue(
    W.controlToAluSourceAMux,
    control.aluSourceA === null
      ? null
      : `ALUSrcA = ${
          ALU_SOURCE_A_PORT[
            control.aluSourceA
          ]
        }`,
  );

  setValue(
    W.controlToAluSourceBMux,
    control.aluSourceB === null
      ? null
      : `ALUSrcB = ${
          ALU_SOURCE_B_PORT[
            control.aluSourceB
          ]
        }`,
  );

  setValue(
    W.controlToAluControl,
    control.aluOperation === null
      ? null
      : `ALUOp = ${control.aluOperation}`,
  );

  setValue(
    W.controlToPcSourceMux,
    control.pcSource === null
      ? null
      : `PCSource = ${
          PC_SOURCE_PORT[
            control.pcSource
          ]
        }`,
  );

  setValue(
    W.controlPcWriteCondToBranchAndGate,
    `PCWriteCond = ${booleanToBit(
      control.pcWriteConditional,
    )}`,
  );

  setValue(
    W.controlPcWriteToPcEnableGate,
    `PCWrite = ${booleanToBit(
      control.pcWrite,
    )}`,
  );

  /*
   * These values are derived by datapath logic rather than
   * emitted directly by the finite-state control unit.
   */
  setValue(
    W.aluZeroToBranchAndGate,
    cycle.datapath.aluZero === null
      ? null
      : `Zero = ${booleanToBit(
          cycle.datapath.aluZero,
        )}`,
  );

  setValue(
    W.branchAndGateToPcEnableGate,
    cycle.branch === null
      ? null
      : `ANDOut = ${booleanToBit(
          cycle.branch.taken,
        )}`,
  );

  setValue(
    W.pcEnableGateToPc,
    `PCEnable = ${booleanToBit(
      cycle.datapath.pcWriteEnabled,
    )}`,
  );

  return values;
}

function booleanToBit(
  value: boolean,
): 0 | 1 {
  return value ? 1 : 0;
}

function requireAlu(
  cycle: MultiCycleCycleResult,
): NonNullable<MultiCycleCycleResult["alu"]> {
  if (cycle.alu === null) {
    throw new Error(
      `${cycle.stateBefore} requires an ALU result.`,
    );
  }

  return cycle.alu;
}

function requireRegisterWrite(
  cycle: MultiCycleCycleResult,
): NonNullable<
  MultiCycleCycleResult["registerWrite"]
> {
  if (cycle.registerWrite === null) {
    throw new Error(
      `${cycle.stateBefore} requires a register write.`,
    );
  }

  return cycle.registerWrite;
}

function formatAluOperation(
  operation:
    NonNullable<MultiCycleCycleResult["alu"]>["operation"],
): string {
  switch (operation) {
    case "ADD":
      return "+";

    case "SUBTRACT":
      return "-";

    case "AND":
      return "AND";

    case "OR":
      return "OR";
  }
}