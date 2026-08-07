import type { AluOperation } from "./alu";
import type { Instruction } from "../instructions/Instruction";

export type AluOp = "00" | "01" | "10";

export interface ControlSignals {
  readonly jump: boolean;
  readonly regDst: boolean;
  readonly aluSrc: boolean;
  readonly memToReg: boolean;
  readonly regWrite: boolean;
  readonly aluOp: AluOp | null;
  readonly memRead: boolean;
  readonly memWrite: boolean;
  readonly branch: boolean;
  readonly aluOperation: AluOperation | null;
}

export function generateControlSignals(instruction: Instruction): ControlSignals {
  switch (instruction.operation) {
    case "add":
      return createRegisterSignals("ADD");

    case "sub":
      return createRegisterSignals("SUBTRACT");

    case "and":
      return createRegisterSignals("AND");

    case "or":
      return createRegisterSignals("OR");

    case "lw":
      return {
        jump: false,
        regDst: false,
        aluSrc: true,
        memToReg: true,
        regWrite: true,
        aluOp: "00",
        memRead: true,
        memWrite: false,
        branch: false,
        aluOperation: "ADD",
      };

    case "sw":
      return {
        jump: false,
        regDst: false,
        aluSrc: true,
        memToReg: false,
        regWrite: false,
        aluOp: "00",
        memRead: false,
        memWrite: true,
        branch: false,
        aluOperation: "ADD",
      };

    case "beq":
        return {
          jump: false,
          regDst: false,
          aluSrc: false,
          memToReg: false,
          regWrite: false,
          aluOp: "01",
          memRead: false,
          memWrite: false,
          branch: true,
          aluOperation: "SUBTRACT",
        };

    case "j":
      return {
        jump: true,
        regDst: false,
        aluSrc: false,
        memToReg: false,
        regWrite: false,
        aluOp: null,          // NA
        memRead: false,
        memWrite: false,
        branch: false,
        aluOperation: null, // NA
      }

    default: throw new Error(
    `Unsupported instruction operation.`,
    );
  }
}

// All CURRENT register operations (R-Format) use the same control signals except the AluOperation
function createRegisterSignals(aluOperation: AluOperation): ControlSignals {
  return {
    jump: false,
    regDst: true,
    aluSrc: false,
    memToReg: false,
    regWrite: true,
    aluOp: "10",
    memRead: false,
    memWrite: false,
    branch: false,
    aluOperation,
  };
}