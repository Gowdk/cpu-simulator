import type { ControlSignals } from
  "../components/controlUnit";
import { generateControlSignals } from
  "../components/controlUnit";
import type { Instruction } from
  "../instructions/Instruction";

export interface DecodedInstruction {
  readonly instruction: Instruction;
  readonly assembly: string;

  readonly sourceARegister: number | null;
  readonly sourceBRegister: number | null;

  readonly destinationRegister: number | null;
  readonly immediate: number | null;
  readonly jumpTarget: number | null;

  readonly controlSignals: ControlSignals;
}

export function decodeSingleCycleInstruction(
  instruction: Instruction,
): DecodedInstruction {
  const controlSignals =
    generateControlSignals(instruction);

  switch (instruction.operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
      return {
        instruction,

        assembly:
          `${instruction.operation} ` +
          `$${instruction.rd}, ` +
          `$${instruction.rs}, ` +
          `$${instruction.rt}`,

        sourceARegister: instruction.rs,
        sourceBRegister: instruction.rt,

        destinationRegister: instruction.rd,
        immediate: null,
        jumpTarget: null,

        controlSignals,
      };

    case "lw":
      return {
        instruction,

        assembly:
          `lw $${instruction.rt}, ` +
          `${instruction.immediate}($${instruction.rs})`,

        sourceARegister: instruction.rs,
        sourceBRegister: null,

        destinationRegister: instruction.rt,
        immediate: instruction.immediate,
        jumpTarget: null,

        controlSignals,
      };

    case "sw":
      return {
        instruction,

        assembly:
          `sw $${instruction.rt}, ` +
          `${instruction.immediate}($${instruction.rs})`,

        sourceARegister: instruction.rs,
        sourceBRegister: instruction.rt,

        destinationRegister: null,
        immediate: instruction.immediate,
        jumpTarget: null,

        controlSignals,
      };
    case "beq":
        return {
            instruction,

            assembly:
            `beq $${instruction.rs}, ` +
            `$${instruction.rt}, ` +
            `${instruction.immediate}`,

            sourceARegister: instruction.rs,
            sourceBRegister: instruction.rt,

            destinationRegister: null,
            immediate: instruction.immediate,
            jumpTarget: null,

            controlSignals,
        };  
    case "j":
      return {
          instruction,
          assembly:
          `j $${instruction.target}`,

          sourceARegister: null,
          sourceBRegister: null,

          destinationRegister: null,

          immediate: null,
          jumpTarget: instruction.target,

          controlSignals,
      }
  }
}