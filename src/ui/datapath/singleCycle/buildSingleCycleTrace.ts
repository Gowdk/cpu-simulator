import type { CycleResult } from
  "../../../domain/cpu/CycleResult";

import type { DatapathFrame } from
  "../core/types";

import {
  SINGLE_CYCLE_PHASE_DEFINITIONS,
  type SingleCyclePhase,
} from "./singleCyclePhases";

import {
  SINGLE_CYCLE_COMPONENT as C,
  SINGLE_CYCLE_WIRE as W,
  type SingleCycleComponentId,
  type SingleCycleWireId,
} from "./singleCycleIds";

export type SingleCycleFrame =
  DatapathFrame<
    SingleCyclePhase,
    SingleCycleComponentId,
    SingleCycleWireId
  >;

export function buildSingleCycleTrace(
  cycle: CycleResult,
): readonly SingleCycleFrame[] {
  return [
    buildInstructionFetchFrame(cycle),
    buildInstructionDecodeFrame(cycle),
    buildOperandFetchFrame(cycle),
    buildExecutionFrame(cycle),
    buildWriteBackFrame(cycle),
  ];
}

function buildInstructionFetchFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const sequentialPc =
    getSequentialPc(cycle);

  return createFrame(
    cycle,
    "IF",
    [
      C.pc,
      C.instructionMemory,
      C.pcPlusFourAdder,
    ],
    [
      W.pcToInstructionMemory,
      W.pcToPcPlusFourAdder,
      W.constantFourToPcPlusFourAdder,
    ],
    {
      [C.pc]: `PC = ${cycle.pcBefore}`,
      [C.instructionMemory]: cycle.assembly,
      [C.pcPlusFourAdder]:
        `PC + 4 = ${sequentialPc}`,
    },
    [
      "The CPU domain executes the full instruction before the UI replays these visual phases.",
      "All values shown during the replay come from the returned CycleResult.",
    ],
  );
}

function buildInstructionDecodeFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const operation =
    cycle.instruction.operation;

  const activeComponents:
    SingleCycleComponentId[] = [
      C.controlUnit,
    ];

  const activeWires:
    SingleCycleWireId[] = [
      W.instructionToControlUnit,
    ];

  switch (operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
      activeComponents.push(
        C.aluControl,
      );

      activeWires.push(
        W.instructionFunctToAluControl,
        W.controlToAluControl,
      );
      break;

    case "lw":
    case "sw":
    case "beq":
      activeComponents.push(
        C.aluControl,
      );

      activeWires.push(
        W.controlToAluControl,
      );
      break;

    case "j":
      break;
  }

  const aluOperation =
    cycle.controlSignals.aluOperation;

  return createFrame(
    cycle,
    "ID",
    activeComponents,
    activeWires,
    {
      //[C.controlUnit]:
        //formatControlSignals(cycle),

      ...(aluOperation === null
        ? {}
        : {
            [C.aluControl]:
              `operation = ${aluOperation}`,
          }),
    },
    [
      `Decoded operation: ${operation}`,
      operation === "j"
        ? "The jump instruction contains no source-register fields."
        : "The ALU control operation is derived during decode.",
    ],
  );
}

function buildOperandFetchFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  switch(cycle.instruction.operation) {}
  const sourceA =
    cycle.registerReads.sourceA;

  const sourceB =
    cycle.registerReads.sourceB;

  const activeWires:
    SingleCycleWireId[] = [];

  const registerValues: string[] = [];

  if (sourceA !== null) {
    activeWires.push(
      W.instructionRsToRegisterFile,
    );

    registerValues.push(
      `$${sourceA.register} = ${sourceA.value}`,
    );
  }

  if (sourceB !== null) {
    activeWires.push(
      W.instructionRtToRegisterFile,
    );

    registerValues.push(
      `$${sourceB.register} = ${sourceB.value}`,
    );
  }

  const readsRegister =
    registerValues.length > 0;

  return createFrame(
    cycle,
    "OF",
    readsRegister
      ? [C.registerFile]
      : [],
    activeWires,
    readsRegister
      ? {
          [C.registerFile]:
            registerValues.join(", "),
        }
      : {},
    readsRegister
      ? [
          registerValues.length === 2
            ? "The register file exposes both required source operands."
            : "The register file exposes the required source operand.",
        ]
      : [
          "This instruction does not read source registers.",
        ],
  );
}

function buildExecutionFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  switch (cycle.instruction.operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
      return buildRegisterExecutionFrame(
        cycle,
      );

    case "lw":
      return buildLoadExecutionFrame(cycle);

    case "sw":
      return buildStoreExecutionFrame(cycle);

    case "beq":
      return buildBranchExecutionFrame(
        cycle,
      );

    case "j":
      return buildJumpExecutionFrame(cycle);
  }
}

function buildRegisterExecutionFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const alu =
    requireAluCycleResult(cycle);

  return createFrame(
    cycle,
    "EX",
    [
      C.aluControl,
      C.aluSrcMux,
      C.alu,
      C.pcSrcMux,
      C.jumpMux,
      C.pc,
    ],
    [
      W.registerReadDataOneToAlu,
      W.registerReadDataTwoToAluSrcMux,
      W.aluControlToAlu,
      W.aluSrcMuxToAlu,
      W.pcPlusFourToPcSrcMux,
      W.pcSrcMuxToJumpMux,
      W.jumpMuxToPc,
    ],
    {
      [C.aluControl]:
        `operation = ${alu.operation}`,

      [C.alu]:
        `${alu.inputA} ` +
        `${formatAluOperation(alu.operation)} ` +
        `${alu.inputB} = ${alu.result}`,

      [C.pc]:
        `next PC = ${cycle.pcAfter}`,
    },
    [
      "The ALU result is retained for the write-back phase.",
      "PCSrc selects PC + 4, and Jump selects the non-jump input.",
    ],
  );
}

function buildLoadExecutionFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const alu =
    requireAluCycleResult(cycle);

  const memoryAccess =
    cycle.memoryAccess;

  if (
    memoryAccess === null ||
    memoryAccess.type !== "read"
  ) {
    throw new Error(
      "A load instruction requires a memory read result.",
    );
  }

  return createFrame(
    cycle,
    "EX",
    [
      C.signExtension,
      C.aluControl,
      C.aluSrcMux,
      C.alu,
      C.dataMemory,
      C.pcSrcMux,
      C.jumpMux,
      C.pc,
    ],
    [
      W.instructionImmediateToSignExtension,
      W.signExtensionToAluSrcMux,
      W.registerReadDataOneToAlu,
      W.controlToAluSrcMux,
      W.aluControlToAlu,
      W.aluSrcMuxToAlu,
      W.aluResultToDataMemory,
      W.controlToMemoryRead,
      W.pcPlusFourToPcSrcMux,
      W.pcSrcMuxToJumpMux,
      W.controlToJumpMux,
      W.jumpMuxToPc,
    ],
    {
      [C.signExtension]:
        `immediate = ${getImmediate(cycle)}`,

      [C.aluControl]:
        `operation = ${alu.operation}`,

      [C.alu]:
        `address = ${alu.result}`,

      [C.dataMemory]:
        `Mem[${memoryAccess.address}]` +
        ` = ${memoryAccess.value}`,

      [C.pc]:
        `next PC = ${cycle.pcAfter}`,
    },
    [
      "Because this phase model has no separate MEM phase, the load's memory read is shown during EX.",
      "PCSrc selects PC + 4, and Jump selects the non-jump input.",
    ],
  );
}

function buildStoreExecutionFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const alu =
    requireAluCycleResult(cycle);

  const memoryAccess =
    cycle.memoryAccess;

  if (
    memoryAccess === null ||
    memoryAccess.type !== "write"
  ) {
    throw new Error(
      "A store instruction requires a memory write result.",
    );
  }

  return createFrame(
    cycle,
    "EX",
    [
      C.signExtension,
      C.aluControl,
      C.aluSrcMux,
      C.alu,
      C.dataMemory,
      C.pcSrcMux,
      C.jumpMux,
      C.pc,
    ],
    [
      W.instructionImmediateToSignExtension,
      W.signExtensionToAluSrcMux,
      W.registerReadDataOneToAlu,
      W.registerReadDataTwoToDataMemory,
      W.controlToAluSrcMux,
      W.aluControlToAlu,
      W.aluSrcMuxToAlu,
      W.aluResultToDataMemory,
      W.controlToMemoryWrite,
      W.pcPlusFourToPcSrcMux,
      W.pcSrcMuxToJumpMux,
      W.controlToJumpMux,
      W.jumpMuxToPc,
    ],
    {
      [C.signExtension]:
        `immediate = ${getImmediate(cycle)}`,

      [C.aluControl]:
        `operation = ${alu.operation}`,

      [C.alu]:
        `address = ${alu.result}`,

      [C.dataMemory]:
        `Mem[${memoryAccess.address}]` +
        ` ← ${memoryAccess.value}`,

      [C.pc]:
        `next PC = ${cycle.pcAfter}`,
    },
    [
      "Because this phase model has no separate MEM phase, the store's memory write is shown during EX.",
      "PCSrc selects PC + 4, and Jump selects the non-jump input.",
    ],
  );
}

function buildBranchExecutionFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const alu =
    requireAluCycleResult(cycle);

  const branch = cycle.branch;

  if (branch === null) {
    throw new Error(
      "A beq instruction requires branch information.",
    );
  }

  const selectedPcWire =
    branch.taken
      ? W.branchTargetAdderToPcSrcMux
      : W.pcPlusFourToPcSrcMux;

  return createFrame(
    cycle,
    "EX",
    [
      C.signExtension,
      C.branchShiftLeftTwo,
      C.branchTargetAdder,
      C.aluControl,
      C.aluSrcMux,
      C.alu,
      C.branchAndGate,
      C.pcSrcMux,
      C.jumpMux,
      C.pc,
    ],
    [
      W.instructionImmediateToSignExtension,
      W.signExtensionToBranchShift,
      W.branchShiftToBranchTargetAdder,
      W.pcPlusFourToBranchTargetAdder,
      W.registerReadDataOneToAlu,
      W.registerReadDataTwoToAluSrcMux,
      W.controlToAluSrcMux,
      W.aluControlToAlu,
      W.aluSrcMuxToAlu,
      W.aluZeroToBranchAndGate,
      W.controlToBranchAndGate,
      W.branchAndGateToPcSrcMux,
      selectedPcWire,
      W.pcSrcMuxToJumpMux,
      W.controlToJumpMux,
      W.jumpMuxToPc,
    ],
    {
      [C.signExtension]:
        `immediate = ${branch.signExtendedImmediate}`,

      [C.branchShiftLeftTwo]:
        `offset = ${branch.shiftedOffset}`,

      [C.branchTargetAdder]:
        `target = ${branch.targetPc}`,

      [C.aluControl]:
        `operation = ${alu.operation}`,

      [C.alu]:
        `${alu.inputA} - ` +
        `${alu.inputB} = ${alu.result}`,

      [C.branchAndGate]:
        `Branch ∧ Zero = ${branch.taken ? 1 : 0}`,

      [C.pc]:
        `next PC = ${cycle.pcAfter}`,
    },
    [
      branch.taken
        ? "The branch target path is selected."
        : "The sequential PC + 4 path is selected.",
      "Jump is deasserted, so the jump mux selects the PCSrc result.",
    ],
  );
}

function buildJumpExecutionFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const jump = cycle.jump;

  if (jump === null) {
    throw new Error(
      "A jump instruction requires jump-target information.",
    );
  }

  return createFrame(
    cycle,
    "EX",
    [
      C.jumpShiftLeftTwo,
      C.jumpMux,
      C.pc,
    ],
    [
      W.instructionJumpFieldToJumpShift,
      W.jumpShiftToJumpMux1,
      W.pcHighBitsToJumpMux,
      W.jumpShiftToJumpMux2,
      W.controlToJumpMux,
      W.jumpMuxToPc,
    ],
    {
      [W.instructionJumpFieldToJumpShift]:
        `index = ${jump.instructionIndex}`,

      [C.jumpShiftLeftTwo]:
        `${jump.instructionIndex} << 2` +
        ` = ${jump.shiftedIndex}`,

      [W.jumpShiftToJumpMux1]:
        `jump bits [27:0] = ` +
        `${jump.shiftedIndex >>> 0}`,

      [W.pcHighBitsToJumpMux]:
        `PC + 4 [31:28] = ` +
        `${jump.upperPcBits >>> 0}`,

      [W.jumpShiftToJumpMux2]:
        `jump address [31:0] = ` +
        `${jump.targetPc}`,

      [C.jumpMux]:
        `selected target = ${jump.targetPc}`,

      [C.pc]:
        `next PC = ${cycle.pcAfter}`,
    },
    [
      "The first jump wire carries the shifted 28-bit instruction index.",
      "The PC + 4 high bits merge with that value to form the 32-bit jump address carried by the second jump wire.",
      "Jump = 1 selects the completed jump target instead of the PCSrc result.",
    ],
  );
}

function buildWriteBackFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  switch (cycle.instruction.operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
      return buildRegisterWriteBackFrame(
        cycle,
      );

    case "lw":
      return buildLoadWriteBackFrame(cycle);

    case "sw":
      return createNoWriteBackFrame(
        cycle,
        "Store instructions update memory and do not write a register.",
      );

    case "beq":
      return createNoWriteBackFrame(
        cycle,
        "Branch instructions select the next PC and do not write a register.",
      );

    case "j":
      return createNoWriteBackFrame(
        cycle,
        "Jump instructions select the next PC and do not write a register.",
      );
  }
}

function buildRegisterWriteBackFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const registerWrite =
    requireRegisterWrite(cycle);

  return createFrame(
    cycle,
    "WB",
    [
      C.regDstMux,
      C.memToRegMux,
      C.registerFile,
    ],
    [
      W.instructionRdToRegDstMux,
      W.controlToRegDstMux,
      W.regDstMuxToRegisterWriteAddress,
      W.aluResultToMemToRegMux,
      W.controlToMemToRegMux,
      W.memToRegMuxToRegisterWriteData,
      W.controlToRegisterWrite,
    ],
    {
      [C.regDstMux]:
        `destination = $${registerWrite.register}`,

      [C.memToRegMux]:
        `value = ${registerWrite.value}`,

      [C.registerFile]:
        `$${registerWrite.register}` +
        ` ← ${registerWrite.value}`,
    },
    [
      "RegDst selects rd, and MemToReg selects the ALU result.",
    ],
  );
}

function buildLoadWriteBackFrame(
  cycle: CycleResult,
): SingleCycleFrame {
  const registerWrite =
    requireRegisterWrite(cycle);

  return createFrame(
    cycle,
    "WB",
    [
      C.regDstMux,
      C.dataMemory,
      C.memToRegMux,
      C.registerFile,
    ],
    [
      W.instructionRtToRegDstMux,
      W.controlToRegDstMux,
      W.regDstMuxToRegisterWriteAddress,
      W.dataMemoryToMemToRegMux,
      W.controlToMemToRegMux,
      W.memToRegMuxToRegisterWriteData,
      W.controlToRegisterWrite,
    ],
    {
      [C.regDstMux]:
        `destination = $${registerWrite.register}`,

      [C.memToRegMux]:
        `value = ${registerWrite.value}`,

      [C.registerFile]:
        `$${registerWrite.register}` +
        ` ← ${registerWrite.value}`,
    },
    [
      "RegDst selects rt, and MemToReg selects the value read from data memory.",
    ],
  );
}

function createNoWriteBackFrame(
  cycle: CycleResult,
  reason: string,
): SingleCycleFrame {
  return createFrame(
    cycle,
    "WB",
    [],
    [],
    {},
    [
      reason,
      "RegWrite = 0, so no register-file write path is active.",
    ],
  );
}

function createFrame(
  cycle: CycleResult,
  phase: SingleCyclePhase,
  activeComponentIds:
    readonly SingleCycleComponentId[],
  activeWireIds:
    readonly SingleCycleWireId[],
  values: SingleCycleFrame["values"],
  notes: readonly string[],
): SingleCycleFrame {
  const definition =
    SINGLE_CYCLE_PHASE_DEFINITIONS[phase];

  return {
    phase,
    phaseLabel: definition.label,
    cycleNumber: cycle.cycleNumber,
    assembly: cycle.assembly,
    description: definition.description,
    activeComponentIds,
    activeWireIds,
    values,
    notes,
  };
}

function requireAluCycleResult(
  cycle: CycleResult,
): NonNullable<CycleResult["alu"]> {
  if (cycle.alu === null) {
    throw new Error(
      `${cycle.instruction.operation} requires an ALU result.`,
    );
  }

  return cycle.alu;
}

function requireRegisterWrite(
  cycle: CycleResult,
): NonNullable<CycleResult["registerWrite"]> {
  if (cycle.registerWrite === null) {
    throw new Error(
      `${cycle.instruction.operation} requires a register write result.`,
    );
  }

  return cycle.registerWrite;
}

function getSequentialPc(
  cycle: CycleResult,
): number {
  return (
    cycle.branch?.sequentialPc ??
    cycle.jump?.sequentialPc ??
    ((cycle.pcBefore + 4) | 0)
  );
}

function getImmediate(
  cycle: CycleResult,
): number {
  if (
    "immediate" in cycle.instruction
  ) {
    return cycle.instruction.immediate;
  }

  throw new Error(
    `${cycle.instruction.operation} does not contain an immediate field.`,
  );
}

// function formatControlSignals(
//   cycle: CycleResult,
// ): string {
//   const signals =
//     cycle.controlSignals;

//   return [
//     `Jump=${numberFromBoolean(signals.jump)}`,
//     `RegDst=${numberFromBoolean(signals.regDst)}`,
//     `ALUSrc=${numberFromBoolean(signals.aluSrc)}`,
//     `MemToReg=${numberFromBoolean(signals.memToReg)}`,
//     `RegWrite=${numberFromBoolean(signals.regWrite)}`,
//     `MemRead=${numberFromBoolean(signals.memRead)}`,
//     `MemWrite=${numberFromBoolean(signals.memWrite)}`,
//     `Branch=${numberFromBoolean(signals.branch)}`,
//     `ALUOp=${signals.aluOp ?? "N/A"}`,
//   ].join("  ");
// }

function numberFromBoolean(
  value: boolean,
): 0 | 1 {
  return value ? 1 : 0;
}

function formatAluOperation(
  operation:
    NonNullable<CycleResult["alu"]>["operation"],
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