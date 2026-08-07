import type {
  CycleResult,
} from "../CycleResult";
import {
  executeAlu,
} from "../components/alu";
import type {
  AluResult,
} from "../components/alu";
import {
  InstructionMemory,
} from "../components/InstructionMemory";
import {
  ProgramCounter,
} from "../components/ProgramCounter";
import {
  RegisterFile,
} from "../components/RegisterFile";
import {
  decodeSingleCycleInstruction,
} from "../architectures/singleCycleDecoder";
import type {
  Instruction,
} from "../instructions/Instruction";
import {
  DataMemory,
} from "../components/DataMemory";
import {
  add,
} from "../components/adder";
import {
  shiftLeftTwice,
} from "../components/shiftLeftTwice";
import {
  createJumpTarget,
} from "../components/CreateJumpTarget";

export class SingleCycleCpu {
  public static readonly CPI = 1;

  private readonly pc: ProgramCounter;
  private readonly registers: RegisterFile;
  private readonly instructionMemory:
    InstructionMemory;
  private readonly dataMemory: DataMemory;

  private cycleCount = 0;

  public constructor(
    program: readonly Instruction[],
  ) {
    this.pc = new ProgramCounter();
    this.registers = new RegisterFile();

    this.instructionMemory =
      new InstructionMemory(program);

    this.dataMemory = new DataMemory();
  }

  /**
   * Executes one complete instruction in one clock
   * cycle.
   */
  public step(): CycleResult {
    /*
     * Instruction fetch.
     */
    const pcBefore = this.pc.read();

    const instruction =
      this.instructionMemory.read(pcBefore);

    /*
     * Instruction decode and control generation.
     */
    const decoded =
      decodeSingleCycleInstruction(
        instruction,
      );

    const controlSignals =
      decoded.controlSignals;

    /*
     * Register-file reads are optional because a
     * jump instruction does not read registers.
     */
    const sourceAValue =
      decoded.sourceARegister === null
        ? null
        : this.registers.read(
            decoded.sourceARegister,
          );

    const sourceBValue =
      decoded.sourceBRegister === null
        ? null
        : this.registers.read(
            decoded.sourceBRegister,
          );

    /*
     * The ALU is not used by every instruction.
     *
     * In particular, j constructs its target using
     * the jump-address datapath rather than the ALU.
     */
    let aluInputA: number | null = null;
    let aluInputB: number | null = null;
    let aluResult: AluResult | null = null;

    if (
      controlSignals.aluOperation !== null
    ) {
      aluInputA =
        this.requireRegisterValue(
          sourceAValue,
          "ALU input A",
        );

      aluInputB =
        controlSignals.aluSrc
          ? this.requireImmediate(
              decoded.immediate,
            )
          : this.requireRegisterValue(
              sourceBValue,
              "ALU input B",
            );

      aluResult = executeAlu(
        controlSignals.aluOperation,
        aluInputA,
        aluInputB,
      );
    }

    /*
     * Data-memory access.
     */
    let memoryAccess:
      CycleResult["memoryAccess"] = null;

    let memoryReadValue:
      number | null = null;

    if (controlSignals.memRead) {
      const requiredAluResult =
        this.requireAluResult(aluResult);

      memoryReadValue =
        this.dataMemory.read(
          requiredAluResult.value,
        );

      memoryAccess = {
        type: "read",
        address: requiredAluResult.value,
        value: memoryReadValue,
      };
    }

    if (controlSignals.memWrite) {
      const requiredAluResult =
        this.requireAluResult(aluResult);

      const requiredSourceBValue =
        this.requireRegisterValue(
          sourceBValue,
          "Data-memory write",
        );

      this.dataMemory.write(
        requiredAluResult.value,
        requiredSourceBValue,
      );

      memoryAccess = {
        type: "write",
        address: requiredAluResult.value,
        value: requiredSourceBValue,
      };
    }

    /*
     * Register write-back.
     */
    let registerWrite:
      CycleResult["registerWrite"] = null;

    if (controlSignals.regWrite) {
      if (
        decoded.destinationRegister === null
      ) {
        throw new Error(
          "RegWrite was asserted without a " +
          "destination register.",
        );
      }

      const writeBackValue =
        controlSignals.memToReg
          ? this.requireMemoryValue(
              memoryReadValue,
            )
          : this.requireAluResult(
              aluResult,
            ).value;

      this.registers.write(
        decoded.destinationRegister,
        writeBackValue,
      );

      registerWrite = {
        register:
          decoded.destinationRegister,
        value: writeBackValue,
      };
    }

    /*
     * Dedicated PC + 4 adder.
     */
    const sequentialPc =
      add(pcBefore, 4);

    let branch:
      CycleResult["branch"] = null;

    let jump:
      CycleResult["jump"] = null;

    /*
     * Unless another PC-selection path is active,
     * execution continues at PC + 4.
     */
    let pcAfter = sequentialPc;

    /*
     * Branch-address datapath.
     */
    if (controlSignals.branch) {
      if (decoded.immediate === null) {
        throw new Error(
          "Branch was asserted without an " +
          "immediate value.",
        );
      }

      /*
       * Sign extension is currently represented by
       * the signed immediate produced by the decoder.
       */
      const signExtendedImmediate =
        decoded.immediate;

      /*
       * Convert the word offset into a byte offset.
       */
      const shiftedOffset =
        shiftLeftTwice(
          signExtendedImmediate,
        );

      /*
       * Dedicated branch-target adder.
       */
      const branchTarget =
        add(
          sequentialPc,
          shiftedOffset,
        );

      /*
       * PCSrc = Branch AND Zero.
       */
      const branchTaken =
        this.requireAluResult(
          aluResult,
        ).zero;

      pcAfter =
        branchTaken
          ? branchTarget
          : sequentialPc;

      branch = {
        sequentialPc,
        immediate: decoded.immediate,
        signExtendedImmediate,
        shiftedOffset,
        targetPc: branchTarget,
        taken: branchTaken,
      };
    }

    /*
     * Jump-address datapath.
     *
     * The jump selection occurs after the branch
     * selection, allowing the jump control signal
     * to select the final next-PC value.
     */
    if (controlSignals.jump) {
      if (decoded.jumpTarget === null) {
        throw new Error(
          "Jump was asserted without a " +
          "jump target.",
        );
      }

      const jumpTargetResult =
        createJumpTarget(
          sequentialPc,
          decoded.jumpTarget,
        );

      pcAfter =
        jumpTargetResult.targetPc;

      jump = {
        sequentialPc,

        instructionIndex:
          decoded.jumpTarget,

        shiftedIndex:
          jumpTargetResult.shiftedIndex,

        upperPcBits:
          jumpTargetResult.upperPcBits,

        targetPc:
          jumpTargetResult.targetPc,
      };
    }

    /*
     * Commit the next PC at the end of the cycle.
     */
    this.pc.write(pcAfter);
    this.cycleCount += 1;

    return {
      cycleNumber: this.cycleCount,

      pcBefore,
      pcAfter,

      instruction,
      assembly: decoded.assembly,

      controlSignals,

      registerReads: {
        sourceA:
          decoded.sourceARegister === null ||
          sourceAValue === null
            ? null
            : {
                register:
                  decoded.sourceARegister,
                value: sourceAValue,
              },

        sourceB:
          decoded.sourceBRegister === null ||
          sourceBValue === null
            ? null
            : {
                register:
                  decoded.sourceBRegister,
                value: sourceBValue,
              },
      },

      alu:
        controlSignals.aluOperation === null ||
        aluInputA === null ||
        aluInputB === null ||
        aluResult === null
          ? null
          : {
              operation:
                controlSignals.aluOperation,

              inputA: aluInputA,
              inputB: aluInputB,

              result: aluResult.value,
              zero: aluResult.zero,
            },

      memoryAccess,
      branch,
      jump,
      registerWrite,
    };
  }

  private requireImmediate(
    immediate: number | null,
  ): number {
    if (immediate === null) {
      throw new Error(
        "ALUSrc was asserted without an " +
        "immediate value.",
      );
    }

    return immediate;
  }

  private requireRegisterValue(
    value: number | null,
    purpose: string,
  ): number {
    if (value === null) {
      throw new Error(
        `${purpose} requires a register value.`,
      );
    }

    return value;
  }

  private requireAluResult(
    result: AluResult | null,
  ): AluResult {
    if (result === null) {
      throw new Error(
        "This datapath operation requires an " +
        "ALU result.",
      );
    }

    return result;
  }

  private requireMemoryValue(
    value: number | null,
  ): number {
    if (value === null) {
      throw new Error(
        "MemToReg was asserted without a " +
        "memory read.",
      );
    }

    return value;
  }

  public setMemory(
    address: number,
    value: number,
  ): void {
    this.dataMemory.write(
      address,
      value,
    );
  }

  public readMemory(
    address: number,
  ): number {
    return this.dataMemory.read(address);
  }

  public setRegister(
    register: number,
    value: number,
  ): void {
    this.registers.write(
      register,
      value,
    );
  }

  public readRegister(
    register: number,
  ): number {
    return this.registers.read(register);
  }

  public readProgramCounter(): number {
    return this.pc.read();
  }

  public getCycleCount(): number {
    return this.cycleCount;
  }

  public reset(): void {
    this.pc.reset();
    this.registers.reset();
    this.dataMemory.reset();
    this.cycleCount = 0;
  }
}

