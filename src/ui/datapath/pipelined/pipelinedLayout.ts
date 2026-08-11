import type {
  DatapathLayout,
} from "../core/types";

import {
  PIPELINED_COMPONENT as C,
  PIPELINED_WIRE as W,
  type PipelinedComponentId,
  type PipelinedWireId,
} from "./pipelinedIds";

/**
 * Five-stage MIPS-style pipelined datapath.
 *
 * Pipeline-register blocks intentionally sit on stage boundaries. During a
 * frame they may receive two activity classes at once (for example IF + ID),
 * making the shared boundary visible.
 */
export const PIPELINED_LAYOUT:
  DatapathLayout<
    PipelinedComponentId,
    PipelinedWireId
  > = {
    viewBox: {
      width: 1900,
      height: 1050,
    },

    components: [
      /* =========================== IF =========================== */
      {
        id: C.pc,
        label: "PC",
        shape: "block",
        x: 45,
        y: 430,
        width: 60,
        height: 110,
        ports: [
          { id: "input", label: "", side: "left", position: 0.70 },
          { id: "output", label: "", side: "right", position: 0.30 },
          { id: "stall", label: "", side: "top", position: 0.50 },
        ],
      },
      {
        id: C.instructionMemory,
        label: "Instr. Mem",
        shape: "block",
        x: 150,
        y: 375,
        width: 145,
        height: 200,
        ports: [
          { id: "address", label: "Address", side: "left", position: 0.35 },
          { id: "instruction", label: "Instruction", side: "right", position: 0.62 },
        ],
      },
      {
        id: C.pcPlusFourAdder,
        label: "Add",
        subtitle: "PC + 4",
        shape: "adder",
        x: 175,
        y: 155,
        width: 55,
        height: 90,
        ports: [
          { id: "pc", label: "", side: "left", position: 0.30 },
          { id: "four", label: "", side: "left", position: 0.72 },
          { id: "result", label: "", side: "right", position: 0.50 },
        ],
      },
      {
        id: C.nextPcMux,
        label: "Next PC",
        shape: "mux",
        x: 70,
        y: 180,
        width: 52,
        height: 125,
        ports: [
          { id: "sequential", label: "0", side: "left", position: 0.25 },
          { id: "redirect", label: "1", side: "left", position: 0.76 },
          { id: "output", label: "", side: "right", position: 0.50 },
          { id: "select", label: "", side: "top", position: 0.50 },
        ],
      },

      /* ========================= IF / ID ======================== */
      {
        id: C.ifIdRegister,
        label: "IF/ID",
        subtitle: "Pipeline Register",
        shape: "block",
        x: 335,
        y: 300,
        width: 105,
        height: 390,
        valuePosition: { x: 387, y: 720 },
        ports: [
          { id: "instruction-in", label: "", side: "left", position: 0.37 },
          { id: "pc4-in", label: "", side: "left", position: 0.18 },
          { id: "instruction-out", label: "", side: "right", position: 0.37 },
          { id: "pc4-out", label: "", side: "right", position: 0.18 },
          { id: "stall", label: "", side: "top", position: 0.35 },
          { id: "flush", label: "", side: "top", position: 0.70 },
        ],
      },

      /* =========================== ID =========================== */
      {
        id: C.controlUnit,
        label: "Control",
        shape: "ellipse",
        x: 485,
        y: 120,
        width: 120,
        height: 175,
        ports: [
          { id: "instruction", label: "Opcode", side: "left", position: 0.60 },
          { id: "control-out", label: "", side: "right", position: 0.60 },
        ],
      },
      {
        id: C.registerFile,
        label: "Register File",
        shape: "block",
        x: 500,
        y: 385,
        width: 175,
        height: 270,
        ports: [
          { id: "read-one", label: "Read reg 1", side: "left", position: 0.20 },
          { id: "read-two", label: "Read reg 2", side: "left", position: 0.34 },
          { id: "write-register", label: "Write reg", side: "left", position: 0.64 },
          { id: "write-data", label: "Write data", side: "left", position: 0.82 },
          { id: "read-data-one", label: "Read data 1", side: "right", position: 0.31 },
          { id: "read-data-two", label: "Read data 2", side: "right", position: 0.66 },
          { id: "reg-write", label: "", side: "top", position: 0.72 },
        ],
      },
      {
        id: C.signExtension,
        label: "Sign Ext.",
        shape: "ellipse",
        x: 520,
        y: 760,
        width: 115,
        height: 85,
        ports: [
          { id: "input", label: "", side: "left", position: 0.50 },
          { id: "output", label: "", side: "right", position: 0.50 },
        ],
      },
      {
        id: C.hazardDetectionUnit,
        label: "Hazard",
        subtitle: "Detection",
        shape: "block",
        x: 475,
        y: 875,
        width: 165,
        height: 105,
        ports: [
          { id: "if-id", label: "IF/ID", side: "left", position: 0.33 },
          { id: "id-ex", label: "ID/EX", side: "right", position: 0.33 },
          { id: "pc-stall", label: "", side: "top", position: 0.25 },
          { id: "if-id-stall", label: "", side: "top", position: 0.52 },
          { id: "id-ex-bubble", label: "", side: "top", position: 0.78 },
        ],
      },

      /* ========================= ID / EX ======================== */
      {
        id: C.idExRegister,
        label: "ID/EX",
        subtitle: "Pipeline Register",
        shape: "block",
        x: 720,
        y: 285,
        width: 115,
        height: 455,
        valuePosition: { x: 777, y: 770 },
        ports: [
          { id: "data-in-a", label: "", side: "left", position: 0.36 },
          { id: "data-in-b", label: "", side: "left", position: 0.56 },
          { id: "immediate-in", label: "", side: "left", position: 0.82 },
          { id: "control-in", label: "", side: "left", position: 0.14 },

          { id: "source-a", label: "", side: "right", position: 0.36 },
          { id: "source-b", label: "", side: "right", position: 0.56 },
          { id: "immediate", label: "", side: "right", position: 0.82 },
          { id: "sequential-pc", label: "", side: "right", position: 0.18 },
          { id: "jump-target", label: "", side: "right", position: 0.08 },
          { id: "register-ids", label: "", side: "bottom", position: 0.52 },

          { id: "bubble", label: "", side: "top", position: 0.35 },
          { id: "flush", label: "", side: "top", position: 0.70 },
        ],
      },

      /* =========================== EX =========================== */
      {
        id: C.forwardingUnit,
        label: "Forwarding",
        subtitle: "Unit",
        shape: "block",
        x: 865,
        y: 790,
        width: 150,
        height: 105,
        ports: [
          { id: "id-ex", label: "ID/EX", side: "left", position: 0.35 },
          { id: "ex-mem", label: "EX/MEM", side: "right", position: 0.25 },
          { id: "mem-wb", label: "MEM/WB", side: "right", position: 0.70 },
          { id: "forward-a", label: "", side: "top", position: 0.32 },
          { id: "forward-b", label: "", side: "top", position: 0.72 },
        ],
      },
      {
        id: C.forwardingAMux,
        label: "Fwd A",
        shape: "mux",
        x: 920,
        y: 360,
        width: 50,
        height: 125,
        ports: [
          { id: "register", label: "RF", side: "left", position: 0.18 },
          { id: "ex-mem", label: "EX", side: "left", position: 0.50 },
          { id: "mem-wb", label: "WB", side: "left", position: 0.82 },
          { id: "output", label: "", side: "right", position: 0.50 },
          { id: "select", label: "", side: "bottom", position: 0.50 },
        ],
      },
      {
        id: C.forwardingBMux,
        label: "Fwd B",
        shape: "mux",
        x: 920,
        y: 535,
        width: 50,
        height: 125,
        ports: [
          { id: "register", label: "RF", side: "left", position: 0.18 },
          { id: "ex-mem", label: "EX", side: "left", position: 0.50 },
          { id: "mem-wb", label: "WB", side: "left", position: 0.82 },
          { id: "output", label: "", side: "right", position: 0.50 },
          { id: "select", label: "", side: "bottom", position: 0.50 },
        ],
      },
      {
        id: C.aluSrcMux,
        label: "ALUSrc",
        shape: "mux",
        x: 1030,
        y: 535,
        width: 50,
        height: 125,
        ports: [
          { id: "register", label: "0", side: "left", position: 0.25 },
          { id: "immediate", label: "1", side: "left", position: 0.75 },
          { id: "output", label: "", side: "right", position: 0.50 },
          { id: "select", label: "", side: "bottom", position: 0.50 },
        ],
      },
      {
        id: C.alu,
        label: "ALU",
        shape: "alu",
        x: 1130,
        y: 410,
        width: 115,
        height: 170,
        ports: [
          { id: "source-a", label: "SrcA", side: "left", position: 0.28 },
          { id: "source-b", label: "SrcB", side: "left", position: 0.72 },
          { id: "zero", label: "Zero", side: "right", position: 0.30 },
          { id: "result", label: "Result", side: "right", position: 0.68 },
        ],
      },
      {
        id: C.branchShiftLeftTwo,
        label: "Shift",
        subtitle: "left 2",
        shape: "ellipse",
        x: 900,
        y: 120,
        width: 75,
        height: 70,
        ports: [
          { id: "input", label: "", side: "left", position: 0.50 },
          { id: "output", label: "", side: "right", position: 0.50 },
        ],
      },
      {
        id: C.branchTargetAdder,
        label: "Add",
        subtitle: "Branch",
        shape: "adder",
        x: 1035,
        y: 105,
        width: 60,
        height: 90,
        ports: [
          { id: "pc", label: "", side: "left", position: 0.28 },
          { id: "offset", label: "", side: "left", position: 0.73 },
          { id: "result", label: "", side: "right", position: 0.50 },
        ],
      },
      {
        id: C.jumpTargetBuilder,
        label: "Jump",
        subtitle: "Target",
        shape: "block",
        x: 1015,
        y: 230,
        width: 100,
        height: 80,
        ports: [
          { id: "pc", label: "", side: "left", position: 0.30 },
          { id: "target", label: "", side: "left", position: 0.72 },
          { id: "result", label: "", side: "right", position: 0.50 },
        ],
      },
      {
        id: C.controlHazardUnit,
        label: "Control",
        subtitle: "Hazard",
        shape: "block",
        x: 1160,
        y: 145,
        width: 150,
        height: 145,
        ports: [
          { id: "branch-target", label: "", side: "left", position: 0.20 },
          { id: "jump-target", label: "", side: "left", position: 0.45 },
          { id: "zero", label: "", side: "left", position: 0.72 },
          { id: "target", label: "", side: "right", position: 0.25 },
          { id: "redirect", label: "", side: "right", position: 0.50 },
          { id: "flush-if-id", label: "", side: "top", position: 0.35 },
          { id: "flush-id-ex", label: "", side: "top", position: 0.70 },
        ],
      },

      /* ========================= EX / MEM ======================= */
      {
        id: C.exMemRegister,
        label: "EX/MEM",
        subtitle: "Pipeline Register",
        shape: "block",
        x: 1290,
        y: 350,
        width: 110,
        height: 340,
        valuePosition: { x: 1345, y: 720 },
        ports: [
          { id: "result-in", label: "", side: "left", position: 0.42 },
          { id: "store-in", label: "", side: "left", position: 0.76 },

          { id: "result", label: "", side: "right", position: 0.42 },
          { id: "store", label: "", side: "right", position: 0.76 },
          { id: "destination", label: "", side: "bottom", position: 0.38 },
          { id: "control", label: "", side: "bottom", position: 0.68 },
        ],
      },

      /* =========================== MEM ========================== */
      {
        id: C.dataMemory,
        label: "Data Memory",
        shape: "block",
        x: 1450,
        y: 385,
        width: 150,
        height: 220,
        ports: [
          { id: "address", label: "Address", side: "left", position: 0.30 },
          { id: "write-data", label: "Write data", side: "left", position: 0.70 },
          { id: "read-data", label: "Read data", side: "right", position: 0.55 },
          { id: "control", label: "", side: "bottom", position: 0.50 },
        ],
      },
      {
        id: C.memToRegMux,
        label: "MemToReg",
        shape: "mux",
        x: 1485,
        y: 690,
        width: 52,
        height: 125,
        ports: [
          { id: "alu", label: "0", side: "left", position: 0.25 },
          { id: "memory", label: "1", side: "left", position: 0.75 },
          { id: "output", label: "", side: "right", position: 0.50 },
          { id: "select", label: "", side: "top", position: 0.50 },
        ],
      },

      /* ========================= MEM / WB ======================= */
      {
        id: C.memWbRegister,
        label: "MEM/WB",
        subtitle: "Pipeline Register",
        shape: "block",
        x: 1640,
        y: 385,
        width: 115,
        height: 300,
        valuePosition: { x: 1697, y: 715 },
        ports: [
          { id: "write-back-in", label: "", side: "left", position: 0.58 },
          { id: "control-in", label: "", side: "left", position: 0.82 },
          { id: "write-back", label: "", side: "right", position: 0.52 },
          { id: "destination", label: "", side: "right", position: 0.70 },
          { id: "reg-write", label: "", side: "right", position: 0.84 },
        ],
      },
    ],

    wires: [
      /* =========================== IF =========================== */
      {
        id: W.pcToInstructionMemory,
        kind: "pc",
        from: port(C.pc, "output"),
        to: port(C.instructionMemory, "address"),
      },
      {
        id: W.pcToPcPlusFourAdder,
        kind: "pc",
        from: port(C.pc, "output"),
        to: port(C.pcPlusFourAdder, "pc"),
        route: [
          { x: 125, y: 463 },
          { x: 125, y: 182 },
        ],
      },
      {
        id: W.constantFourToPcPlusFourAdder,
        kind: "data",
        label: "4",
        from: point(140, 220),
        to: port(C.pcPlusFourAdder, "four"),
      },
      {
        id: W.pcPlusFourToIfId,
        kind: "pc",
        from: port(C.pcPlusFourAdder, "result"),
        to: port(C.ifIdRegister, "pc4-in"),
        route: [
          { x: 270, y: 200 },
          { x: 270, y: 370 },
        ],
      },
      {
        id: W.instructionMemoryToIfId,
        kind: "data",
        from: port(C.instructionMemory, "instruction"),
        to: port(C.ifIdRegister, "instruction-in"),
      },
      {
        id: W.pcPlusFourToNextPcMux,
        kind: "pc",
        from: port(C.pcPlusFourAdder, "result"),
        to: port(C.nextPcMux, "sequential"),
        route: [
          { x: 270, y: 200 },
          { x: 270, y: 115 },
          { x: 35, y: 115 },
          { x: 35, y: 211 },
        ],
      },
      {
        id: W.nextPcMuxToPc,
        kind: "pc",
        from: port(C.nextPcMux, "output"),
        to: port(C.pc, "input"),
        route: [
          { x: 135, y: 243 },
          { x: 135, y: 340 },
          { x: 20, y: 340 },
          { x: 20, y: 507 },
        ],
      },

      /* =========================== ID =========================== */
      {
        id: W.ifIdInstructionToControl,
        kind: "data",
        from: port(C.ifIdRegister, "instruction-out"),
        to: port(C.controlUnit, "instruction"),
        route: [
          { x: 460, y: 444 },
          { x: 460, y: 225 },
        ],
      },
      {
        id: W.ifIdRsToRegisterFile,
        kind: "data",
        label: "rs",
        from: port(C.ifIdRegister, "instruction-out"),
        to: port(C.registerFile, "read-one"),
      },
      {
        id: W.ifIdRtToRegisterFile,
        kind: "data",
        label: "rt",
        from: port(C.ifIdRegister, "instruction-out"),
        to: port(C.registerFile, "read-two"),
        route: [
          { x: 470, y: 444 },
          { x: 470, y: 477 },
        ],
      },
      {
        id: W.ifIdImmediateToSignExtension,
        kind: "data",
        label: "imm[15:0]",
        from: port(C.ifIdRegister, "instruction-out"),
        to: port(C.signExtension, "input"),
        route: [
          { x: 465, y: 444 },
          { x: 465, y: 802 },
        ],
      },
      {
        id: W.ifIdToHazardDetection,
        kind: "data",
        from: port(C.ifIdRegister, "instruction-out"),
        to: port(C.hazardDetectionUnit, "if-id"),
        route: [
          { x: 455, y: 444 },
          { x: 455, y: 910 },
        ],
      },
      {
        id: W.controlToIdEx,
        kind: "control",
        from: port(C.controlUnit, "control-out"),
        to: port(C.idExRegister, "control-in"),
        route: [
          { x: 690, y: 225 },
          { x: 690, y: 350 },
        ],
      },
      {
        id: W.registerReadOneToIdEx,
        kind: "data",
        from: port(C.registerFile, "read-data-one"),
        to: port(C.idExRegister, "data-in-a"),
      },
      {
        id: W.registerReadTwoToIdEx,
        kind: "data",
        from: port(C.registerFile, "read-data-two"),
        to: port(C.idExRegister, "data-in-b"),
      },
      {
        id: W.signExtensionToIdEx,
        kind: "data",
        from: port(C.signExtension, "output"),
        to: port(C.idExRegister, "immediate-in"),
        route: [
          { x: 675, y: 802 },
          { x: 690, y: 802 },
          { x: 690, y: 658 },
        ],
      },
      {
        id: W.idExToHazardDetection,
        kind: "control",
        from: port(C.idExRegister, "register-ids"),
        to: port(C.hazardDetectionUnit, "id-ex"),
        route: [
          { x: 777, y: 780 },
          { x: 777, y: 930 },
          { x: 660, y: 930 },
        ],
      },
      {
        id: W.hazardToPc,
        kind: "control",
        label: "stall PC",
        from: port(C.hazardDetectionUnit, "pc-stall"),
        to: port(C.pc, "stall"),
        route: [
          { x: 515, y: 850 },
          { x: 515, y: 70 },
          { x: 75, y: 70 },
          { x: 75, y: 410 },
        ],
      },
      {
        id: W.hazardToIfId,
        kind: "control",
        label: "stall IF/ID",
        from: port(C.hazardDetectionUnit, "if-id-stall"),
        to: port(C.ifIdRegister, "stall"),
        route: [
          { x: 560, y: 850 },
          { x: 560, y: 265 },
          { x: 372, y: 265 },
        ],
      },
      {
        id: W.hazardToIdEx,
        kind: "control",
        label: "bubble ID/EX",
        from: port(C.hazardDetectionUnit, "id-ex-bubble"),
        to: port(C.idExRegister, "bubble"),
        route: [
          { x: 605, y: 850 },
          { x: 605, y: 255 },
          { x: 760, y: 255 },
        ],
      },

      /* =========================== EX =========================== */
      {
        id: W.idExSourceAToForwardingAMux,
        kind: "data",
        from: port(C.idExRegister, "source-a"),
        to: port(C.forwardingAMux, "register"),
      },
      {
        id: W.idExSourceBToForwardingBMux,
        kind: "data",
        from: port(C.idExRegister, "source-b"),
        to: port(C.forwardingBMux, "register"),
      },
      {
        id: W.idExRegistersToForwardingUnit,
        kind: "control",
        from: port(C.idExRegister, "register-ids"),
        to: port(C.forwardingUnit, "id-ex"),
        route: [
          { x: 777, y: 770 },
          { x: 845, y: 770 },
          { x: 845, y: 827 },
        ],
      },
      {
        id: W.exMemDestinationToForwardingUnit,
        kind: "control",
        from: port(C.exMemRegister, "destination"),
        to: port(C.forwardingUnit, "ex-mem"),
        route: [
          { x: 1332, y: 730 },
          { x: 1332, y: 945 },
          { x: 1040, y: 945 },
          { x: 1040, y: 816 },
        ],
      },
      {
        id: W.memWbDestinationToForwardingUnit,
        kind: "control",
        from: port(C.memWbRegister, "destination"),
        to: port(C.forwardingUnit, "mem-wb"),
        route: [
          { x: 1765, y: 595 },
          { x: 1805, y: 595 },
          { x: 1805, y: 990 },
          { x: 1040, y: 990 },
          { x: 1040, y: 863 },
        ],
      },
      {
        id: W.forwardingUnitToForwardingAMux,
        kind: "control",
        label: "ForwardA",
        from: port(C.forwardingUnit, "forward-a"),
        to: port(C.forwardingAMux, "select"),
        route: [
          { x: 913, y: 755 },
          { x: 945, y: 755 },
        ],
      },
      {
        id: W.forwardingUnitToForwardingBMux,
        kind: "control",
        label: "ForwardB",
        from: port(C.forwardingUnit, "forward-b"),
        to: port(C.forwardingBMux, "select"),
        route: [
          { x: 973, y: 755 },
          { x: 945, y: 755 },
          { x: 945, y: 685 },
        ],
      },
      {
        id: W.exMemResultToForwardingAMux,
        kind: "data",
        from: port(C.exMemRegister, "result"),
        to: port(C.forwardingAMux, "ex-mem"),
        route: [
          { x: 1420, y: 493 },
          { x: 1420, y: 930 },
          { x: 890, y: 930 },
          { x: 890, y: 423 },
        ],
      },
      {
        id: W.exMemResultToForwardingBMux,
        kind: "data",
        from: port(C.exMemRegister, "result"),
        to: port(C.forwardingBMux, "ex-mem"),
        route: [
          { x: 1420, y: 493 },
          { x: 1420, y: 930 },
          { x: 895, y: 930 },
          { x: 895, y: 598 },
        ],
      },
      {
        id: W.memWbValueToForwardingAMux,
        kind: "data",
        from: port(C.memWbRegister, "write-back"),
        to: port(C.forwardingAMux, "mem-wb"),
        route: [
          { x: 1780, y: 541 },
          { x: 1835, y: 541 },
          { x: 1835, y: 1015 },
          { x: 875, y: 1015 },
          { x: 875, y: 463 },
        ],
      },
      {
        id: W.memWbValueToForwardingBMux,
        kind: "data",
        from: port(C.memWbRegister, "write-back"),
        to: port(C.forwardingBMux, "mem-wb"),
        route: [
          { x: 1780, y: 541 },
          { x: 1835, y: 541 },
          { x: 1835, y: 1015 },
          { x: 880, y: 1015 },
          { x: 880, y: 638 },
        ],
      },
      {
        id: W.forwardingAMuxToAlu,
        kind: "data",
        from: port(C.forwardingAMux, "output"),
        to: port(C.alu, "source-a"),
        route: [
          { x: 995, y: 423 },
          { x: 1100, y: 423 },
          { x: 1100, y: 458 },
        ],
      },
      {
        id: W.forwardingBMuxToAluSrcMux,
        kind: "data",
        from: port(C.forwardingBMux, "output"),
        to: port(C.aluSrcMux, "register"),
      },
      {
        id: W.forwardingBMuxToExMemStore,
        kind: "memory",
        from: port(C.forwardingBMux, "output"),
        to: port(C.exMemRegister, "store-in"),
        route: [
          { x: 995, y: 598 },
          { x: 995, y: 710 },
          { x: 1260, y: 710 },
          { x: 1260, y: 608 },
        ],
      },
      {
        id: W.idExImmediateToAluSrcMux,
        kind: "data",
        from: port(C.idExRegister, "immediate"),
        to: port(C.aluSrcMux, "immediate"),
        route: [
          { x: 875, y: 658 },
          { x: 875, y: 628 },
        ],
      },
      {
        id: W.aluSrcMuxToAlu,
        kind: "data",
        from: port(C.aluSrcMux, "output"),
        to: port(C.alu, "source-b"),
        route: [
          { x: 1100, y: 598 },
          { x: 1100, y: 532 },
        ],
      },
      {
        id: W.aluToExMem,
        kind: "data",
        from: port(C.alu, "result"),
        to: port(C.exMemRegister, "result-in"),
      },

      /* Branch/jump target hardware */
      {
        id: W.idExImmediateToBranchShift,
        kind: "branch",
        from: port(C.idExRegister, "immediate"),
        to: port(C.branchShiftLeftTwo, "input"),
        route: [
          { x: 870, y: 658 },
          { x: 870, y: 155 },
        ],
      },
      {
        id: W.branchShiftToBranchTargetAdder,
        kind: "branch",
        from: port(C.branchShiftLeftTwo, "output"),
        to: port(C.branchTargetAdder, "offset"),
      },
      {
        id: W.idExSequentialPcToBranchTargetAdder,
        kind: "pc",
        from: port(C.idExRegister, "sequential-pc"),
        to: port(C.branchTargetAdder, "pc"),
        route: [
          { x: 875, y: 367 },
          { x: 875, y: 130 },
        ],
      },
      {
        id: W.branchTargetAdderToControlHazard,
        kind: "branch",
        from: port(C.branchTargetAdder, "result"),
        to: port(C.controlHazardUnit, "branch-target"),
      },
      {
        id: W.aluZeroToControlHazard,
        kind: "control",
        from: port(C.alu, "zero"),
        to: port(C.controlHazardUnit, "zero"),
        route: [
          { x: 1260, y: 461 },
          { x: 1330, y: 461 },
          { x: 1330, y: 249 },
        ],
      },
      {
        id: W.idExJumpTargetToJumpTargetBuilder,
        kind: "branch",
        from: port(C.idExRegister, "jump-target"),
        to: port(C.jumpTargetBuilder, "target"),
        route: [
          { x: 875, y: 321 },
          { x: 875, y: 288 },
        ],
      },
      {
        id: W.idExSequentialPcToJumpTargetBuilder,
        kind: "pc",
        from: port(C.idExRegister, "sequential-pc"),
        to: port(C.jumpTargetBuilder, "pc"),
      },
      {
        id: W.jumpTargetBuilderToControlHazard,
        kind: "branch",
        from: port(C.jumpTargetBuilder, "result"),
        to: port(C.controlHazardUnit, "jump-target"),
      },
      {
        id: W.controlHazardTargetToNextPcMux,
        kind: "branch",
        from: port(C.controlHazardUnit, "target"),
        to: port(C.nextPcMux, "redirect"),
        route: [
          { x: 1340, y: 181 },
          { x: 1340, y: 45 },
          { x: 25, y: 45 },
          { x: 25, y: 275 },
        ],
      },
      {
        id: W.controlHazardToNextPcMux,
        kind: "control",
        label: "RedirectPC",
        from: port(C.controlHazardUnit, "redirect"),
        to: port(C.nextPcMux, "select"),
        route: [
          { x: 1350, y: 218 },
          { x: 1350, y: 85 },
          { x: 96, y: 85 },
          { x: 96, y: 155 },
        ],
      },
      {
        id: W.controlHazardToIfId,
        kind: "control",
        label: "FlushIFID",
        from: port(C.controlHazardUnit, "flush-if-id"),
        to: port(C.ifIdRegister, "flush"),
        route: [
          { x: 1212, y: 115 },
          { x: 1212, y: 95 },
          { x: 408, y: 95 },
          { x: 408, y: 280 },
        ],
      },
      {
        id: W.controlHazardToIdEx,
        kind: "control",
        label: "FlushIDEX",
        from: port(C.controlHazardUnit, "flush-id-ex"),
        to: port(C.idExRegister, "flush"),
        route: [
          { x: 1265, y: 115 },
          { x: 1265, y: 75 },
          { x: 800, y: 75 },
          { x: 800, y: 265 },
        ],
      },

      /* =========================== MEM ========================== */
      {
        id: W.exMemResultToDataMemory,
        kind: "memory",
        from: port(C.exMemRegister, "result"),
        to: port(C.dataMemory, "address"),
      },
      {
        id: W.exMemStoreToDataMemory,
        kind: "memory",
        from: port(C.exMemRegister, "store"),
        to: port(C.dataMemory, "write-data"),
      },
      {
        id: W.exMemControlToDataMemory,
        kind: "control",
        label: "MemRead / MemWrite",
        from: port(C.exMemRegister, "control"),
        to: port(C.dataMemory, "control"),
        route: [
          { x: 1365, y: 735 },
          { x: 1525, y: 735 },
          { x: 1525, y: 625 },
        ],
      },
      {
        id: W.exMemResultToMemToRegMux,
        kind: "data",
        from: port(C.exMemRegister, "result"),
        to: port(C.memToRegMux, "alu"),
        route: [
          { x: 1425, y: 493 },
          { x: 1425, y: 720 },
        ],
      },
      {
        id: W.dataMemoryToMemToRegMux,
        kind: "memory",
        from: port(C.dataMemory, "read-data"),
        to: port(C.memToRegMux, "memory"),
        route: [
          { x: 1620, y: 506 },
          { x: 1620, y: 784 },
        ],
      },
      {
        id: W.exMemControlToMemToRegMux,
        kind: "control",
        label: "MemToReg",
        from: port(C.exMemRegister, "control"),
        to: port(C.memToRegMux, "select"),
        route: [
          { x: 1365, y: 735 },
          { x: 1511, y: 735 },
          { x: 1511, y: 665 },
        ],
      },
      {
        id: W.memToRegMuxToMemWb,
        kind: "data",
        from: port(C.memToRegMux, "output"),
        to: port(C.memWbRegister, "write-back-in"),
      },
      {
        id: W.exMemControlToMemWb,
        kind: "control",
        from: port(C.exMemRegister, "control"),
        to: port(C.memWbRegister, "control-in"),
        route: [
          { x: 1365, y: 735 },
          { x: 1615, y: 735 },
          { x: 1615, y: 631 },
        ],
      },

      /* =========================== WB =========================== */
      {
        id: W.memWbWriteBackToRegisterFile,
        kind: "data",
        from: port(C.memWbRegister, "write-back"),
        to: port(C.registerFile, "write-data"),
        route: [
          { x: 1785, y: 541 },
          { x: 1860, y: 541 },
          { x: 1860, y: 1025 },
          { x: 450, y: 1025 },
          { x: 450, y: 606 },
        ],
      },
      {
        id: W.memWbDestinationToRegisterFile,
        kind: "data",
        from: port(C.memWbRegister, "destination"),
        to: port(C.registerFile, "write-register"),
        route: [
          { x: 1790, y: 595 },
          { x: 1815, y: 595 },
          { x: 1815, y: 1000 },
          { x: 430, y: 1000 },
          { x: 430, y: 558 },
        ],
      },
      {
        id: W.memWbRegWriteToRegisterFile,
        kind: "control",
        label: "RegWrite",
        from: port(C.memWbRegister, "reg-write"),
        to: port(C.registerFile, "reg-write"),
        route: [
          { x: 1800, y: 637 },
          { x: 1840, y: 637 },
          { x: 1840, y: 35 },
          { x: 626, y: 35 },
          { x: 626, y: 365 },
        ],
      },
    ],
  };

function port(
  componentId: PipelinedComponentId,
  portId: string,
) {
  return {
    componentId,
    portId,
  } as const;
}

function point(
  x: number,
  y: number,
) {
  return {
    point: { x, y },
  } as const;
}
