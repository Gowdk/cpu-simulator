import type {
  PipelinedCycleResult,
  PipelineRegisterSnapshot,
} from "../../../domain/cpu/architectures/pipelined/PipelinedCycleResult";
import type {
  ForwardingSource,
} from "../../../domain/cpu/architectures/pipelined/hazards/forwardingUnit";
import type {
  Instruction,
} from "../../../domain/cpu/instructions/Instruction";

import type {
  DatapathActivityGroup,
  DatapathFrame,
} from "../core/types";

import {
  PIPELINED_COMPONENT as C,
  PIPELINED_WIRE as W,
  type PipelinedComponentId,
  type PipelinedWireId,
} from "./pipelinedIds";

import {
  PIPELINED_PHASE_DEFINITIONS,
  type PipelinedPhase,
} from "./pipelinedPhases";

export type PipelinedStage =
  | "if"
  | "id"
  | "ex"
  | "mem"
  | "wb";

export type PipelinedFrame =
  DatapathFrame<
    PipelinedPhase,
    PipelinedComponentId,
    PipelinedWireId
  >;

/**
 * Converts one real pipeline clock cycle into one frame containing five
 * overlapping stage-activity groups.
 */
export function buildPipelinedFrame(
  cycle: PipelinedCycleResult,
): PipelinedFrame {
  const groups:
    DatapathActivityGroup<
      PipelinedComponentId,
      PipelinedWireId
    >[] = [];

  const values:
    Partial<
      Record<
        PipelinedComponentId | PipelinedWireId,
        string
      >
    > = {};

  buildIfStage(cycle, groups, values);
  buildIdStage(cycle, groups, values);
  buildExStage(cycle, groups, values);
  buildMemStage(cycle, groups, values);
  buildWbStage(cycle, groups, values);

  addPipelineRegisterValues(
    cycle,
    values,
  );

  const activeComponentIds =
    unique(
      groups.flatMap(
        group => group.componentIds,
      ),
    );

  const activeWireIds =
    unique(
      groups.flatMap(
        group => group.wireIds,
      ),
    );

  const definition =
    PIPELINED_PHASE_DEFINITIONS.PIPELINE;

  return {
    phase: "PIPELINE",
    phaseLabel: definition.label,
    cycleNumber: cycle.cycleNumber,
    assembly: buildOccupancySummary(cycle),
    description: definition.description,
    activeComponentIds,
    activeWireIds,
    activityGroups: groups,
    values,
    notes: buildNotes(cycle),
  };
}

function buildIfStage(
  cycle: PipelinedCycleResult,
  groups:
    DatapathActivityGroup<
      PipelinedComponentId,
      PipelinedWireId
    >[],
  values:
    Partial<
      Record<
        PipelinedComponentId | PipelinedWireId,
        string
      >
    >,
): void {
  const hasFetch =
    cycle.fetchedInstruction !== null;

  const stalled =
    cycle.hazard.stallPc ||
    cycle.hazard.stallIfId;

  const redirected =
    cycle.controlHazard.redirectPc;

  if (
    !hasFetch &&
    !stalled &&
    !redirected
  ) {
    return;
  }

  const components:
    PipelinedComponentId[] = [
      C.pc,
      C.ifIdRegister,
    ];

  const wires:
    PipelinedWireId[] = [];

  if (hasFetch) {
    components.push(
      C.instructionMemory,
      C.pcPlusFourAdder,
      C.nextPcMux,
    );

    wires.push(
      W.pcToInstructionMemory,
      W.pcToPcPlusFourAdder,
      W.constantFourToPcPlusFourAdder,
      W.instructionMemoryToIfId,
      W.pcPlusFourToIfId,
      W.pcPlusFourToNextPcMux,
      W.nextPcMuxToPc,
    );

    values[C.instructionMemory] =
      formatInstruction(
        cycle.fetchedInstruction,
      );

    values[C.pcPlusFourAdder] =
      `PC + 4 = ${(cycle.pcBefore + 4) | 0}`;

    values[C.nextPcMux] =
      `sequential → ${cycle.pcAfter}`;
  }

  if (stalled) {
    values[C.pc] =
      `PC held at ${cycle.pcAfter}`;

    values[C.hazardDetectionUnit] =
      "STALL: freeze PC + IF/ID, bubble ID/EX";
  } else if (redirected) {
    values[C.pc] =
      `PC ← ${cycle.pcAfter}`;
  } else {
    values[C.pc] =
      `PC ${cycle.pcBefore} → ${cycle.pcAfter}`;
  }

  groups.push({
    key: "if",
    componentIds: components,
    wireIds: wires,
  });
}

function buildIdStage(
  cycle: PipelinedCycleResult,
  groups:
    DatapathActivityGroup<
      PipelinedComponentId,
      PipelinedWireId
    >[],
  values:
    Partial<
      Record<
        PipelinedComponentId | PipelinedWireId,
        string
      >
    >,
): void {
  const current =
    cycle.current.ifId;

  if (current === null) {
    return;
  }

  /*
   * A redirect invalidates the instruction currently in ID. The IF/ID
   * register still appears as occupied/flushed, but we do not pretend
   * the wrong-path decode result was allowed into ID/EX.
   */
  if (cycle.controlHazard.flushIdEx) {
    groups.push({
      key: "id",
      componentIds: [
        C.ifIdRegister,
        C.hazardDetectionUnit,
      ],
      wireIds: [
        W.ifIdToHazardDetection,
      ],
    });

    values[C.hazardDetectionUnit] =
      "wrong-path instruction discarded";

    return;
  }

  const instruction =
    current.instruction;

  const components:
    PipelinedComponentId[] = [
      C.ifIdRegister,
      C.controlUnit,
      C.hazardDetectionUnit,
      C.idExRegister,
    ];

  const wires:
    PipelinedWireId[] = [
      W.ifIdInstructionToControl,
      W.ifIdToHazardDetection,
      W.idExToHazardDetection,
      W.controlToIdEx,
    ];

  if (readsSourceA(instruction)) {
    components.push(C.registerFile);

    wires.push(
      W.ifIdRsToRegisterFile,
      W.registerReadOneToIdEx,
    );
  }

  if (readsSourceB(instruction)) {
    components.push(C.registerFile);

    wires.push(
      W.ifIdRtToRegisterFile,
      W.registerReadTwoToIdEx,
    );
  }

  if (hasImmediate(instruction)) {
    components.push(C.signExtension);

    wires.push(
      W.ifIdImmediateToSignExtension,
      W.signExtensionToIdEx,
    );
  }

  values[C.controlUnit] =
    formatInstruction(instruction);

  values[C.hazardDetectionUnit] =
    cycle.hazard.stallPc
      ? "load-use hazard detected"
      : "no load-use stall";

  if (cycle.hazard.stallPc) {
    wires.push(
      W.hazardToPc,
      W.hazardToIfId,
      W.hazardToIdEx,
    );

    values[W.hazardToPc] =
      "stallPC = 1";
    values[W.hazardToIfId] =
      "stallIFID = 1";
    values[W.hazardToIdEx] =
      "bubbleIDEX = 1";
  }

  groups.push({
    key: "id",
    componentIds: unique(components),
    wireIds: unique(wires),
  });
}

function buildExStage(
  cycle: PipelinedCycleResult,
  groups:
    DatapathActivityGroup<
      PipelinedComponentId,
      PipelinedWireId
    >[],
  values:
    Partial<
      Record<
        PipelinedComponentId | PipelinedWireId,
        string
      >
    >,
): void {
  const current =
    cycle.current.idEx;

  if (current === null) {
    return;
  }

  const instruction =
    current.instruction;

  const components:
    PipelinedComponentId[] = [
      C.idExRegister,
      C.exMemRegister,
    ];

  const wires:
    PipelinedWireId[] = [];

  const hasAluOperation =
    current.controlSignals.aluOperation !== null;

  if (hasAluOperation) {
    components.push(
      C.forwardingUnit,
      C.forwardingAMux,
      C.forwardingBMux,
      C.aluSrcMux,
      C.alu,
    );

    wires.push(
      W.idExRegistersToForwardingUnit,
      W.exMemDestinationToForwardingUnit,
      W.memWbDestinationToForwardingUnit,
      W.forwardingUnitToForwardingAMux,
      W.forwardingUnitToForwardingBMux,
    );

    if (
      current.sourceARegister !== null
    ) {
      wires.push(
        W.idExSourceAToForwardingAMux,
        selectedForwardingWire(
          "A",
          cycle.forwarding?.forwardA ??
            "REGISTER",
        ),
        W.forwardingAMuxToAlu,
      );
    }

    if (
      current.sourceBRegister !== null
    ) {
      wires.push(
        W.idExSourceBToForwardingBMux,
        selectedForwardingWire(
          "B",
          cycle.forwarding?.forwardB ??
            "REGISTER",
        ),
      );
    }

    if (current.controlSignals.aluSrc) {
      wires.push(
        W.idExImmediateToAluSrcMux,
      );
    } else {
      wires.push(
        W.forwardingBMuxToAluSrcMux,
      );
    }

    wires.push(
      W.aluSrcMuxToAlu,
      W.aluToExMem,
    );

    if (
      instruction.operation === "sw"
    ) {
      wires.push(
        W.forwardingBMuxToExMemStore,
      );
    }

    const forwardedA =
      selectForwardedValue(
        cycle,
        "A",
      );

    const forwardedB =
      selectForwardedValue(
        cycle,
        "B",
      );

    values[C.forwardingUnit] =
      `A=${formatForwardingSource(
        cycle.forwarding?.forwardA ??
          "REGISTER",
      )}, B=${formatForwardingSource(
        cycle.forwarding?.forwardB ??
          "REGISTER",
      )}`;

    if (forwardedA !== null) {
      values[C.forwardingAMux] =
        `selected ${forwardedA}`;
    }

    if (forwardedB !== null) {
      values[C.forwardingBMux] =
        `selected ${forwardedB}`;
    }

    const inputB =
      current.controlSignals.aluSrc
        ? current.immediate
        : forwardedB;

    values[C.aluSrcMux] =
      current.controlSignals.aluSrc
        ? `immediate = ${inputB ?? "N/A"}`
        : `register = ${inputB ?? "N/A"}`;

    values[C.alu] =
      `${current.controlSignals.aluOperation}` +
      ` → ${cycle.next.exMem?.aluResult ?? "N/A"}`;
  }

  switch (instruction.operation) {
    case "beq": {
      components.push(
        C.branchShiftLeftTwo,
        C.branchTargetAdder,
        C.controlHazardUnit,
      );

      wires.push(
        W.idExImmediateToBranchShift,
        W.branchShiftToBranchTargetAdder,
        W.idExSequentialPcToBranchTargetAdder,
        W.branchTargetAdderToControlHazard,
        W.aluZeroToControlHazard,
      );

      const target =
        branchTarget(
          current.sequentialPc,
          current.immediate,
        );

      values[C.branchTargetAdder] =
        `target = ${target}`;

      values[C.controlHazardUnit] =
        cycle.controlHazard.redirectPc
          ? `TAKEN → ${cycle.pcAfter}`
          : "not taken";

      if (
        cycle.controlHazard.redirectPc
      ) {
        wires.push(
          W.controlHazardTargetToNextPcMux,
          W.controlHazardToNextPcMux,
          W.controlHazardToIfId,
          W.controlHazardToIdEx,
          W.nextPcMuxToPc,
        );

        components.push(
          C.nextPcMux,
          C.pc,
          C.ifIdRegister,
        );

        values[C.nextPcMux] =
          `redirect → ${cycle.pcAfter}`;
      }

      break;
    }

    case "j": {
      components.push(
        C.jumpTargetBuilder,
        C.controlHazardUnit,
        C.nextPcMux,
        C.pc,
        C.ifIdRegister,
      );

      wires.push(
        W.idExJumpTargetToJumpTargetBuilder,
        W.idExSequentialPcToJumpTargetBuilder,
        W.jumpTargetBuilderToControlHazard,
        W.controlHazardTargetToNextPcMux,
        W.controlHazardToNextPcMux,
        W.controlHazardToIfId,
        W.controlHazardToIdEx,
        W.nextPcMuxToPc,
      );

      values[C.jumpTargetBuilder] =
        `target = ${cycle.pcAfter}`;

      values[C.controlHazardUnit] =
        `JUMP → ${cycle.pcAfter}`;

      values[C.nextPcMux] =
        `redirect → ${cycle.pcAfter}`;

      break;
    }

    default:
      break;
  }

  if (
    cycle.controlHazard.flushIdEx
  ) {
    components.push(C.idExRegister);

    values[W.controlHazardToIfId] =
      "FlushIFID = 1";
    values[W.controlHazardToIdEx] =
      "FlushIDEX = 1";
  }

  groups.push({
    key: "ex",
    componentIds: unique(components),
    wireIds: unique(wires),
  });
}

function buildMemStage(
  cycle: PipelinedCycleResult,
  groups:
    DatapathActivityGroup<
      PipelinedComponentId,
      PipelinedWireId
    >[],
  values:
    Partial<
      Record<
        PipelinedComponentId | PipelinedWireId,
        string
      >
    >,
): void {
  const current =
    cycle.current.exMem;

  if (current === null) {
    return;
  }

  const components:
    PipelinedComponentId[] = [
      C.exMemRegister,
      C.memWbRegister,
    ];

  const wires:
    PipelinedWireId[] = [
      W.exMemControlToMemWb,
    ];

  if (
    current.controlSignals.memRead ||
    current.controlSignals.memWrite
  ) {
    components.push(C.dataMemory);

    wires.push(
      W.exMemResultToDataMemory,
      W.exMemControlToDataMemory,
    );

    if (current.controlSignals.memWrite) {
      wires.push(
        W.exMemStoreToDataMemory,
      );
    }

    if (cycle.memoryAccess !== null) {
      const access =
        cycle.memoryAccess;

      values[C.dataMemory] =
        access.type === "read"
          ? `Mem[${access.address}] = ${access.value}`
          : `Mem[${access.address}] ← ${access.value}`;
    }
  }

  if (current.controlSignals.regWrite) {
    components.push(C.memToRegMux);

    wires.push(
      W.exMemResultToMemToRegMux,
      W.exMemControlToMemToRegMux,
      W.memToRegMuxToMemWb,
    );

    if (current.controlSignals.memToReg) {
      wires.push(
        W.dataMemoryToMemToRegMux,
      );
    }

    values[C.memToRegMux] =
      `writeBack = ${cycle.next.memWb?.writeBackValue ?? "N/A"}`;
  }

  groups.push({
    key: "mem",
    componentIds: unique(components),
    wireIds: unique(wires),
  });
}

function buildWbStage(
  cycle: PipelinedCycleResult,
  groups:
    DatapathActivityGroup<
      PipelinedComponentId,
      PipelinedWireId
    >[],
  values:
    Partial<
      Record<
        PipelinedComponentId | PipelinedWireId,
        string
      >
    >,
): void {
  const current =
    cycle.current.memWb;

  if (current === null) {
    return;
  }

  const components:
    PipelinedComponentId[] = [
      C.memWbRegister,
    ];

  const wires:
    PipelinedWireId[] = [];

  if (
    current.regWrite &&
    current.destinationRegister !== null &&
    current.writeBackValue !== null
  ) {
    components.push(C.registerFile);

    wires.push(
      W.memWbWriteBackToRegisterFile,
      W.memWbDestinationToRegisterFile,
      W.memWbRegWriteToRegisterFile,
    );

    values[C.registerFile] =
      `$${current.destinationRegister}` +
      ` ← ${current.writeBackValue}`;
  }

  groups.push({
    key: "wb",
    componentIds: components,
    wireIds: wires,
  });
}

function addPipelineRegisterValues(
  cycle: PipelinedCycleResult,
  values:
    Partial<
      Record<
        PipelinedComponentId | PipelinedWireId,
        string
      >
    >,
): void {
  values[C.ifIdRegister] =
    formatIfIdTransition(cycle);

  values[C.idExRegister] =
    formatIdExTransition(cycle);

  values[C.exMemRegister] =
    formatNextInstruction(
      cycle.next.exMem?.instruction ??
        null,
    );

  values[C.memWbRegister] =
    formatNextInstruction(
      cycle.next.memWb?.instruction ??
        null,
    );
}

function formatIfIdTransition(
  cycle: PipelinedCycleResult,
): string {
  if (cycle.controlHazard.flushIfId) {
    return "FLUSHED";
  }

  if (cycle.hazard.stallIfId) {
    return cycle.current.ifId === null
      ? "HOLD: empty"
      : `HOLD: ${formatInstruction(
          cycle.current.ifId.instruction,
        )}`;
  }

  return formatNextInstruction(
    cycle.next.ifId?.instruction ??
      null,
  );
}

function formatIdExTransition(
  cycle: PipelinedCycleResult,
): string {
  if (cycle.controlHazard.flushIdEx) {
    return "FLUSHED";
  }

  if (cycle.hazard.bubbleIdEx) {
    return "BUBBLE";
  }

  return formatNextInstruction(
    cycle.next.idEx?.instruction ??
      null,
  );
}

function formatNextInstruction(
  instruction: Instruction | null,
): string {
  return instruction === null
    ? "EMPTY"
    : `← ${formatInstruction(instruction)}`;
}

function buildOccupancySummary(
  cycle: PipelinedCycleResult,
): string {
  const stages = [
    `IF: ${
      cycle.fetchedInstruction === null
        ? cycle.hazard.stallPc
          ? "STALL"
          : cycle.controlHazard.redirectPc
            ? "REDIRECT"
            : "—"
        : formatInstruction(
            cycle.fetchedInstruction,
          )
    }`,
    `ID: ${formatSnapshotInstruction(
      cycle.current.ifId,
    )}`,
    `EX: ${formatSnapshotInstruction(
      cycle.current.idEx,
    )}`,
    `MEM: ${formatSnapshotInstruction(
      cycle.current.exMem,
    )}`,
    `WB: ${formatSnapshotInstruction(
      cycle.current.memWb,
    )}`,
  ];

  return stages.join(" · ");
}

function buildNotes(
  cycle: PipelinedCycleResult,
): readonly string[] {
  const notes: string[] = [];

  if (cycle.hazard.stallPc) {
    notes.push(
      "Load-use hazard: PC and IF/ID are frozen while ID/EX receives a bubble.",
    );
  }

  if (cycle.forwarding !== null) {
    const { forwardA, forwardB } =
      cycle.forwarding;

    if (
      forwardA !== "REGISTER" ||
      forwardB !== "REGISTER"
    ) {
      notes.push(
        `Forwarding: A=${formatForwardingSource(
          forwardA,
        )}, B=${formatForwardingSource(
          forwardB,
        )}.`,
      );
    }
  }

  if (cycle.controlHazard.redirectPc) {
    notes.push(
      `Control redirect: PC ← ${cycle.pcAfter}; IF/ID and ID/EX are flushed.`,
    );
  }

  if (cycle.registerWrite !== null) {
    notes.push(
      `WB commits $${cycle.registerWrite.register} ← ${cycle.registerWrite.value}.`,
    );
  }

  if (notes.length === 0) {
    notes.push(
      "No stall, flush, or forwarded operand is required this cycle.",
    );
  }

  return notes;
}

function selectedForwardingWire(
  operand: "A" | "B",
  source: ForwardingSource,
): PipelinedWireId {
  if (operand === "A") {
    switch (source) {
      case "REGISTER":
        return W.idExSourceAToForwardingAMux;

      case "EX_MEM":
        return W.exMemResultToForwardingAMux;

      case "MEM_WB":
        return W.memWbValueToForwardingAMux;
    }
  }

  switch (source) {
    case "REGISTER":
      return W.idExSourceBToForwardingBMux;

    case "EX_MEM":
      return W.exMemResultToForwardingBMux;

    case "MEM_WB":
      return W.memWbValueToForwardingBMux;
  }
}

function selectForwardedValue(
  cycle: PipelinedCycleResult,
  operand: "A" | "B",
): number | null {
  const current =
    cycle.current.idEx;

  const decision =
    cycle.forwarding;

  if (
    current === null ||
    decision === null
  ) {
    return null;
  }

  const source =
    operand === "A"
      ? decision.forwardA
      : decision.forwardB;

  switch (source) {
    case "REGISTER":
      return operand === "A"
        ? current.sourceAValue
        : current.sourceBValue;

    case "EX_MEM":
      return cycle.current.exMem
        ?.aluResult ?? null;

    case "MEM_WB":
      return cycle.current.memWb
        ?.writeBackValue ?? null;
  }
}

function branchTarget(
  sequentialPc: number,
  immediate: number | null,
): number {
  if (immediate === null) {
    return sequentialPc;
  }

  return (
    sequentialPc +
    ((immediate << 2) | 0)
  ) | 0;
}

function formatForwardingSource(
  source: ForwardingSource,
): string {
  switch (source) {
    case "REGISTER":
      return "Register";

    case "EX_MEM":
      return "EX/MEM";

    case "MEM_WB":
      return "MEM/WB";
  }
}

function formatSnapshotInstruction(
  contents:
    PipelineRegisterSnapshot[keyof PipelineRegisterSnapshot],
): string {
  return contents === null
    ? "—"
    : formatInstruction(
        contents.instruction,
      );
}

function readsSourceA(
  instruction: Instruction,
): boolean {
  return instruction.operation !== "j";
}

function readsSourceB(
  instruction: Instruction,
): boolean {
  switch (instruction.operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
    case "sw":
    case "beq":
      return true;

    case "lw":
    case "j":
      return false;
  }
}

function hasImmediate(
  instruction: Instruction,
): boolean {
  return (
    instruction.operation === "lw" ||
    instruction.operation === "sw" ||
    instruction.operation === "beq"
  );
}

function formatInstruction(
  instruction: Instruction,
): string {
  switch (instruction.operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
      return (
        `${instruction.operation} ` +
        `$${instruction.rd}, ` +
        `$${instruction.rs}, ` +
        `$${instruction.rt}`
      );

    case "lw":
    case "sw":
      return (
        `${instruction.operation} ` +
        `$${instruction.rt}, ` +
        `${instruction.immediate}(` +
        `$${instruction.rs})`
      );

    case "beq":
      return (
        `beq $${instruction.rs}, ` +
        `$${instruction.rt}, ` +
        `${instruction.immediate}`
      );

    case "j":
      return `j ${instruction.target}`;
  }
}

function unique<T>(
  values: readonly T[],
): T[] {
  return [...new Set(values)];
}
