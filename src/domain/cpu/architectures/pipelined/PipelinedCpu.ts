import { add } from "../../components/adder";
import { executeAlu } from "../../components/alu";
import type { AluResult } from "../../components/alu";
import { createJumpTarget } from "../../components/CreateJumpTarget";
import { DataMemory } from "../../components/DataMemory";
import { InstructionMemory } from "../../components/InstructionMemory";
import { ProgramCounter } from "../../components/ProgramCounter";
import { RegisterFile } from "../../components/RegisterFile";
import { shiftLeftTwice } from "../../components/shiftLeftTwice";
import { decodeSingleCycleInstruction } from "../singleCycleDecoder";
import type { Instruction } from "../../instructions/Instruction";
import type {
  MemoryAccessResult,
  RegisterWriteResult,
} from "../../CycleResult";
import {
  determineForwarding,
} from "./hazards/forwardingUnit";
import type {
  ForwardingDecision,
  ForwardingSource,
} from "./hazards/forwardingUnit";
import {
  detectHazard,
} from "./hazards/hazardDetectionUnit";
import {
  resolveControlHazard,
} from "./hazards/controlHazardUnit";
import {
  IFIDRegister,
} from "./pipelineRegisters/IFIDRegister";
import type {
  IFIDContents,
} from "./pipelineRegisters/IFIDRegister";
import {
  IDEXRegister,
} from "./pipelineRegisters/IDEXRegister";
import type {
  IDEXContents,
} from "./pipelineRegisters/IDEXRegister";
import {
  EXMEMRegister,
} from "./pipelineRegisters/EXMEMRegister";
import type {
  EXMEMContents,
} from "./pipelineRegisters/EXMEMRegister";
import {
  MEMWBRegister,
} from "./pipelineRegisters/MEMWBRegister";
import type {
  MEMWBContents,
} from "./pipelineRegisters/MEMWBRegister";
import type {
  PipelineControlTransfer,
  PipelinedCycleResult,
} from "./PipelinedCycleResult";

/**
 * Five-stage pipelined CPU.
 *
 * Stages:
 *   IF -> ID -> EX -> MEM -> WB
 *
 * Register-result forwarding is supported from EX/MEM and MEM/WB.
 * A stateless hazard-detection unit inserts a one-cycle bubble for
 * load-use hazards that forwarding cannot resolve.
 *
 * Branches and jumps are resolved in EX. A stateless control-hazard
 * unit converts that EX-stage result into PC redirect and flush controls.
 */
export class PipelinedCpu {
  private readonly pc: ProgramCounter;
  private readonly registers: RegisterFile;
  private readonly instructionMemory: InstructionMemory;
  private readonly dataMemory: DataMemory;

  private readonly ifId = new IFIDRegister();
  private readonly idEx = new IDEXRegister();
  private readonly exMem = new EXMEMRegister();
  private readonly memWb = new MEMWBRegister();

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
   * Simulates one clock cycle.
   *
   * Every stage reads only committed/current pipeline-register values.
   * Stage outputs are collected in local next* values and committed
   * together at the simulated clock edge.
   */
  public step(): PipelinedCycleResult {
    const pcBefore = this.pc.read();

    const currentIFID = this.ifId.read();
    const currentIDEX = this.idEx.read();
    const currentEXMEM = this.exMem.read();
    const currentMEMWB = this.memWb.read();

    /*
     * -------------------------
     * WB
     * -------------------------
     *
     * WB runs first in the simulator so ID-stage register reads in the
     * same cycle observe values written by WB.
     */
    const registerWrite =
      this.executeWriteBackStage(
        currentMEMWB,
      );

    /*
     * -------------------------
     * MEM
     * -------------------------
     */
    const {
      nextMEMWB,
      memoryAccess,
    } = this.executeMemoryStage(
      currentEXMEM,
    );

    /*
     * -------------------------
     * EX
     * -------------------------
     */
    const {
      nextEXMEM,
      controlTransfer,
      forwarding,
    } = this.executeExecuteStage(
      currentIDEX,
      currentEXMEM,
      currentMEMWB,
    );

    /*
     * EX produces the control-transfer datapath result.
     * The stateless control-hazard unit produces only redirect/flush
     * control signals from that result.
     */
    const controlHazard =
      resolveControlHazard(
        controlTransfer,
      );

    /*
     * -------------------------
     * ID
     * -------------------------
     *
     * First produce the instruction that ID would normally place into
     * ID/EX. The hazard-detection unit compares that candidate against
     * the instruction currently occupying ID/EX.
     */
    const decodedIDEXCandidate =
      controlHazard.flushIdEx
        ? null
        : this.executeDecodeStage(
            currentIFID,
          );

    const hazard =
      detectHazard(
        currentIDEX,
        decodedIDEXCandidate,
      );

    /*
     * Control-hazard flushing has priority over data-hazard stalling.
     *
     * A load-use hazard inserts a bubble into ID/EX while the dependent
     * instruction remains preserved in IF/ID.
     */
    const nextIDEX =
      controlHazard.flushIdEx ||
      hazard.bubbleIdEx
        ? null
        : decodedIDEXCandidate;

    /*
     * -------------------------
     * IF
     * -------------------------
     */
    let nextIFID: IFIDContents | null;
    let nextPc: number;

    let fetchedInstruction:
      Instruction | null = null;

    if (controlHazard.redirectPc) {
      /*
       * Control hazards have highest priority.
       *
       * EX supplies the target-PC datapath value. The control-hazard
       * unit supplies the redirect and flush controls.
       */
      if (controlTransfer === null) {
        throw new Error(
          "PC redirect was asserted without a control-transfer target.",
        );
      }

      nextIFID =
        controlHazard.flushIfId
          ? null
          : currentIFID;

      nextPc =
        controlTransfer.targetPc;
    } else if (
      hazard.stallPc &&
      hazard.stallIfId
    ) {
      /*
       * Load-use stall:
       *
       * - PC does not advance.
       * - IF/ID keeps the dependent instruction.
       * - ID/EX receives the bubble selected above.
       *
       * EX/MEM and MEM/WB still commit their normal next values.
       */
      nextIFID = currentIFID;
      nextPc = pcBefore;
    } else if (
      this.instructionMemory.hasInstruction(
        pcBefore,
      )
    ) {
      fetchedInstruction =
        this.instructionMemory.read(pcBefore);

      const sequentialPc =
        add(pcBefore, 4);

      nextIFID = {
        pc: pcBefore,
        sequentialPc,
        instruction: fetchedInstruction,
      };

      nextPc = sequentialPc;
    } else {
      /*
       * No new instruction is fetched, but existing instructions can
       * continue draining through the pipeline.
       */
      nextIFID = null;
      nextPc = pcBefore;
    }

    /*
     * -------------------------
     * COMMIT / CLOCK EDGE
     * -------------------------
     */
    this.memWb.write(nextMEMWB);
    this.exMem.write(nextEXMEM);
    this.idEx.write(nextIDEX);
    this.ifId.write(nextIFID);
    this.pc.write(nextPc);

    this.cycleCount += 1;

    return {
      cycleNumber: this.cycleCount,

      pcBefore,
      pcAfter: nextPc,

      current: {
        ifId: currentIFID,
        idEx: currentIDEX,
        exMem: currentEXMEM,
        memWb: currentMEMWB,
      },

      next: {
        ifId: nextIFID,
        idEx: nextIDEX,
        exMem: nextEXMEM,
        memWb: nextMEMWB,
      },

      fetchedInstruction,
      memoryAccess,
      registerWrite,
      forwarding,
      hazard,
      controlHazard,
      controlTransfer,
    };
  }

  private executeWriteBackStage(
    current:
      MEMWBContents | null,
  ): RegisterWriteResult | null {
    if (
      current === null ||
      !current.regWrite
    ) {
      return null;
    }

    if (
      current.destinationRegister === null
    ) {
      throw new Error(
        "WB asserted RegWrite without a " +
        "destination register.",
      );
    }

    const writeBackValue =
      this.requireValue(
        current.writeBackValue,
        "WB requires a write-back value.",
      );

    this.registers.write(
      current.destinationRegister,
      writeBackValue,
    );

    return {
      register:
        current.destinationRegister,
      value: writeBackValue,
    };
  }

  private executeMemoryStage(
    current:
      EXMEMContents | null,
  ): {
    readonly nextMEMWB:
      MEMWBContents | null;
    readonly memoryAccess:
      MemoryAccessResult | null;
  } {
    if (current === null) {
      return {
        nextMEMWB: null,
        memoryAccess: null,
      };
    }

    let memoryReadValue:
      number | null = null;

    let memoryAccess:
      MemoryAccessResult | null = null;

    if (current.controlSignals.memRead) {
      const address =
        this.requireValue(
          current.aluResult,
          "MEM read requires an ALU address.",
        );

      memoryReadValue =
        this.dataMemory.read(address);

      memoryAccess = {
        type: "read",
        address,
        value: memoryReadValue,
      };
    }

    if (current.controlSignals.memWrite) {
      const address =
        this.requireValue(
          current.aluResult,
          "MEM write requires an ALU address.",
        );

      const value =
        this.requireValue(
          current.storeValue,
          "MEM write requires store data.",
        );

      this.dataMemory.write(
        address,
        value,
      );

      memoryAccess = {
        type: "write",
        address,
        value,
      };
    }

    let writeBackValue:
      number | null = null;

    if (current.controlSignals.regWrite) {
      writeBackValue =
        current.controlSignals.memToReg
          ? this.requireValue(
              memoryReadValue,
              "MemToReg requires memory read data.",
            )
          : this.requireValue(
              current.aluResult,
              "Register write-back requires an ALU result.",
            );
    }

    return {
      nextMEMWB: {
        instruction: current.instruction,

        writeBackValue,

        destinationRegister:
          current.destinationRegister,

        regWrite:
          current.controlSignals.regWrite,
      },

      memoryAccess,
    };
  }

  private executeExecuteStage(
    current:
      IDEXContents | null,
    currentEXMEM:
      EXMEMContents | null,
    currentMEMWB:
      MEMWBContents | null,
  ): {
    readonly nextEXMEM:
      EXMEMContents | null;
    readonly controlTransfer:
      PipelineControlTransfer | null;
    readonly forwarding:
      ForwardingDecision | null;
  } {
    if (current === null) {
      return {
        nextEXMEM: null,
        controlTransfer: null,
        forwarding: null,
      };
    }

    const signals =
      current.controlSignals;

    /*
     * The forwarding unit produces only mux-control decisions.
     * PipelinedCpu performs the actual datapath value selection.
     */
    const forwarding =
      determineForwarding(
        current,
        currentEXMEM,
        currentMEMWB,
      );

    /*
     * Forward the two register-file outputs BEFORE ALUSrc selects
     * between the second register operand and the immediate.
     *
     * This also lets forwardedSourceB become the data carried by SW.
     */
    const forwardedSourceA =
      current.sourceARegister === null
        ? null
        : this.selectForwardedValue(
            forwarding.forwardA,
            current.sourceAValue,
            currentEXMEM,
            currentMEMWB,
            "source A",
          );

    const forwardedSourceB =
      current.sourceBRegister === null
        ? null
        : this.selectForwardedValue(
            forwarding.forwardB,
            current.sourceBValue,
            currentEXMEM,
            currentMEMWB,
            "source B",
          );

    let aluResult:
      AluResult | null = null;

    if (signals.aluOperation !== null) {
      const inputA =
        this.requireValue(
          forwardedSourceA,
          "EX ALU input A requires a register value.",
        );

      const inputB =
        signals.aluSrc
          ? this.requireValue(
              current.immediate,
              "EX ALU input B requires an immediate.",
            )
          : this.requireValue(
              forwardedSourceB,
              "EX ALU input B requires a register value.",
            );

      aluResult = executeAlu(
        signals.aluOperation,
        inputA,
        inputB,
      );
    }

    let controlTransfer:
      PipelineControlTransfer | null = null;

    if (signals.branch) {
      const immediate =
        this.requireValue(
          current.immediate,
          "Branch requires an immediate.",
        );

      const branchTaken =
        this.requireAluResult(
          aluResult,
          "Branch requires an ALU comparison.",
        ).zero;

      if (branchTaken) {
        const shiftedOffset =
          shiftLeftTwice(immediate);

        const targetPc =
          add(
            current.sequentialPc,
            shiftedOffset,
          );

        controlTransfer = {
          type: "branch",
          instruction: current.instruction,
          taken: true,
          targetPc,
        };
      }
    }

    if (signals.jump) {
      const jumpTarget =
        this.requireValue(
          current.jumpTarget,
          "Jump requires a target.",
        );

      const target =
        createJumpTarget(
          current.sequentialPc,
          jumpTarget,
        );

      controlTransfer = {
        type: "jump",
        instruction: current.instruction,
        targetPc: target.targetPc,
      };
    }

    return {
      nextEXMEM: {
        instruction: current.instruction,

        aluResult:
          aluResult?.value ?? null,

        /*
         * This is the forwarded register-B value, not the ALU's B
         * input. Therefore SW can receive forwarding even though its
         * ALU B input is selected from the immediate.
         */
        storeValue:
          forwardedSourceB,

        destinationRegister:
          current.destinationRegister,

        controlSignals: {
          memRead: signals.memRead,
          memWrite: signals.memWrite,
          memToReg: signals.memToReg,
          regWrite: signals.regWrite,
        },
      },

      controlTransfer,
      forwarding,
    };
  }

  private executeDecodeStage(
    current:
      IFIDContents | null,
  ): IDEXContents | null {
    if (current === null) {
      return null;
    }

    const decoded =
      decodeSingleCycleInstruction(
        current.instruction,
      );

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

    return {
      instruction: current.instruction,

      pc: current.pc,
      sequentialPc:
        current.sequentialPc,

      sourceARegister:
        decoded.sourceARegister,
      sourceBRegister:
        decoded.sourceBRegister,

      sourceAValue,
      sourceBValue,

      destinationRegister:
        decoded.destinationRegister,

      immediate: decoded.immediate,
      jumpTarget: decoded.jumpTarget,

      controlSignals: {
        aluSrc:
          decoded.controlSignals.aluSrc,

        aluOperation:
          decoded.controlSignals
            .aluOperation,

        memRead:
          decoded.controlSignals.memRead,

        memWrite:
          decoded.controlSignals.memWrite,

        memToReg:
          decoded.controlSignals.memToReg,

        regWrite:
          decoded.controlSignals.regWrite,

        branch:
          decoded.controlSignals.branch,

        jump:
          decoded.controlSignals.jump,
      },
    };
  }

  private selectForwardedValue(
    source: ForwardingSource,
    registerValue: number | null,
    currentEXMEM: EXMEMContents | null,
    currentMEMWB: MEMWBContents | null,
    operandName: string,
  ): number {
    switch (source) {
      case "REGISTER":
        return this.requireValue(
          registerValue,
          `Forwarding ${operandName} requires its register value.`,
        );

      case "EX_MEM":
        if (currentEXMEM === null) {
          throw new Error(
            `Forwarding ${operandName} selected EX/MEM without an instruction.`,
          );
        }

        return this.requireValue(
          currentEXMEM.aluResult,
          `Forwarding ${operandName} from EX/MEM requires an ALU result.`,
        );

      case "MEM_WB":
        if (currentMEMWB === null) {
          throw new Error(
            `Forwarding ${operandName} selected MEM/WB without an instruction.`,
          );
        }

        return this.requireValue(
          currentMEMWB.writeBackValue,
          `Forwarding ${operandName} from MEM/WB requires a write-back value.`,
        );
    }
  }

  private requireValue(
    value: number | null,
    message: string,
  ): number {
    if (value === null) {
      throw new Error(message);
    }

    return value;
  }

  private requireAluResult(
    result: AluResult | null,
    message: string,
  ): AluResult {
    if (result === null) {
      throw new Error(message);
    }

    return result;
  }

  /**
   * True once instruction memory has no instruction at the PC and
   * every pipeline register is empty.
   */
  public isHalted(): boolean {
    return (
      !this.instructionMemory.hasInstruction(
        this.pc.read(),
      ) &&
      this.ifId.read() === null &&
      this.idEx.read() === null &&
      this.exMem.read() === null &&
      this.memWb.read() === null
    );
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

    this.ifId.reset();
    this.idEx.reset();
    this.exMem.reset();
    this.memWb.reset();

    this.cycleCount = 0;
  }
}
