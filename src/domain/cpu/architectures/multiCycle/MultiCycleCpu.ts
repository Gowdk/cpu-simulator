import {
  executeAlu,
  type AluResult,
} from "../../components/alu";
import {
  createJumpTarget,
  type JumpTargetResult,
} from "../../components/CreateJumpTarget";
import {
  ProgramCounter,
} from "../../components/ProgramCounter";
import {
  RegisterFile,
} from "../../components/RegisterFile";
import {
  shiftLeftTwice,
} from "../../components/shiftLeftTwice";
import type {
  Instruction,
} from "../../instructions/Instruction";
import type {
  MultiCycleCycleResult,
  MultiCycleInternalRegistersSnapshot,
  MultiCycleMemoryAccessResult,
  MultiCycleRegisterReadResult,
  MultiCycleRegisterWriteResult,
} from "./MultiCycleCycleResult";
import type {
  MultiCycleControlSignals,
} from "./MultiCycleControlSignals";
import {
  generateMultiCycleControl,
} from "./generateMultiCycleControl";
import {
  getNextMultiCycleState,
} from "./getNextMultiCycleState";
import {
  MultiCycleMemory,
} from "./MultiCycleMemory";
import type {
  MultiCycleState,
} from "./MultiCycleState";

const BYTES_PER_INSTRUCTION = 4;

export class MultiCycleCpu {
  private readonly pc:
    ProgramCounter;

  private readonly registers:
    RegisterFile;

  private readonly memory:
    MultiCycleMemory;

  private readonly instructionCount:
    number;

  private instructionRegister:
    Instruction | null = null;

  private memoryDataRegister = 0;
  private aRegister = 0;
  private bRegister = 0;
  private aluOutRegister = 0;

  private state:
    MultiCycleState =
      "instruction-fetch";

  private cycleCount = 0;
  private retiredInstructionCount = 0;

  public constructor(
    program: readonly Instruction[],
  ) {
    this.pc = new ProgramCounter();
    this.registers = new RegisterFile();
    this.memory = new MultiCycleMemory(
      program,
    );
    this.instructionCount = program.length;
  }

  /**
   * Executes exactly one multicycle FSM state.
   */
  public stepCycle(): MultiCycleCycleResult {
    if (this.isProgramComplete()) {
      throw new Error(
        "The multicycle program has completed.",
      );
    }

    const stateBefore = this.state;
    const pcBefore = this.pc.read();

    const internalBefore =
      this.createInternalSnapshot();

    let fetchedInstruction:
      Instruction | null = null;

    if (stateBefore === "instruction-fetch") {
      fetchedInstruction =
        this.memory.readInstruction(pcBefore);
    }

    const instruction =
      fetchedInstruction ??
      this.requireInstructionRegister(
        stateBefore,
      );

    const controlSignals =
      generateMultiCycleControl(
        stateBefore,
        instruction,
      );

    const assembly =
      formatInstruction(instruction);

    const immediate =
      getImmediate(instruction);

    const signExtendedImmediate =
      immediate;

    const shiftedImmediate =
      immediate === null
        ? null
        : shiftLeftTwice(immediate);

    const registerReads =
      this.readDecodeOperands(
        stateBefore,
        instruction,
      );

    const alu = this.executeCurrentAluPath(
      controlSignals,
      pcBefore,
      signExtendedImmediate,
      shiftedImmediate,
    );

    const memoryAddress =
      this.selectMemoryAddress(
        controlSignals,
        pcBefore,
        internalBefore.aluOutRegister,
      );

    let memoryAccess:
      MultiCycleMemoryAccessResult | null = null;

    let nextInstructionRegister =
      internalBefore.instructionRegister;

    let nextMemoryDataRegister =
      internalBefore.memoryDataRegister;

    if (controlSignals.memoryRead) {
      if (memoryAddress === null) {
        throw new Error(
          "MemRead requires a selected memory address.",
        );
      }

      if (
        controlSignals.instructionRegisterWrite
      ) {
        const instructionValue =
          fetchedInstruction ??
          this.memory.readInstruction(
            memoryAddress,
          );

        nextInstructionRegister =
          instructionValue;

        memoryAccess = {
          type: "instruction-read",
          address: memoryAddress,
          instruction: instructionValue,
        };
      } else {
        const value =
          this.memory.readData(
            memoryAddress,
          );

        nextMemoryDataRegister = value;

        memoryAccess = {
          type: "data-read",
          address: memoryAddress,
          value,
        };
      }
    }

    if (controlSignals.memoryWrite) {
      if (memoryAddress === null) {
        throw new Error(
          "MemWrite requires a selected memory address.",
        );
      }

      const value =
        internalBefore.bRegister;

      this.memory.writeData(
        memoryAddress,
        value,
      );

      memoryAccess = {
        type: "data-write",
        address: memoryAddress,
        value,
      };
    }

    let registerWrite:
      MultiCycleRegisterWriteResult | null = null;

    if (controlSignals.registerWrite) {
      registerWrite =
        this.performRegisterWrite(
          instruction,
          controlSignals,
          internalBefore,
        );
    }

    let jumpTargetResult:
      JumpTargetResult | null = null;

    if (
      controlSignals.pcSource ===
      "jump-target"
    ) {
      if (instruction.operation !== "j") {
        throw new Error(
          "Jump-target PC source requires a j instruction.",
        );
      }

      jumpTargetResult =
        createJumpTarget(
          pcBefore,
          instruction.target,
        );
    }

    const pcCandidate =
      this.selectPcCandidate(
        controlSignals,
        alu,
        internalBefore.aluOutRegister,
        jumpTargetResult,
      );

    const pcWriteEnabled =
      controlSignals.pcWrite ||
      (
        controlSignals.pcWriteConditional &&
        alu?.zero === true
      );

    if (pcWriteEnabled) {
      if (pcCandidate === null) {
        throw new Error(
          "PC write was enabled without a selected PC value.",
        );
      }

      this.pc.write(pcCandidate);
    }

    this.instructionRegister =
      nextInstructionRegister;

    this.memoryDataRegister =
      nextMemoryDataRegister;

    if (stateBefore === "instruction-decode") {
      this.aRegister =
        registerReads.sourceA?.value ?? 0;

      this.bRegister =
        registerReads.sourceB?.value ?? 0;
    }

    if (alu !== null) {
      this.aluOutRegister = alu.value;
    }

    const stateAfter =
      getNextMultiCycleState(
        stateBefore,
        instruction,
      );

    const instructionRetired =
      retiresInstruction(stateBefore);

    if (instructionRetired) {
      this.retiredInstructionCount += 1;
    }

    this.state = stateAfter;
    this.cycleCount += 1;

    const pcAfter = this.pc.read();
    const internalAfter =
      this.createInternalSnapshot();

    const branch =
      stateBefore === "branch"
        ? {
            targetPc:
              internalBefore.aluOutRegister,

            comparisonResult:
              this.requireAluResult(
                alu,
                "Branch comparison",
              ).value,

            taken: pcWriteEnabled,
          }
        : null;

    const jump =
      jumpTargetResult === null
        ? null
        : {
            instructionIndex:
              instruction.operation === "j"
                ? instruction.target
                : 0,

            shiftedIndex:
              jumpTargetResult.shiftedIndex,

            upperPcBits:
              jumpTargetResult.upperPcBits,

            targetPc:
              jumpTargetResult.targetPc,
          };

    return {
      cycleNumber: this.cycleCount,

      instructionNumber:
        instructionRetired
          ? this.retiredInstructionCount
          : this.retiredInstructionCount + 1,

      stateBefore,
      stateAfter,

      instruction,
      assembly,

      controlSignals,

      pcBefore,
      pcAfter,

      internalRegisters: {
        before: internalBefore,
        after: internalAfter,
      },

      registerReads,

      alu:
        alu === null ||
        controlSignals.aluOperation === null
          ? null
          : {
              operation:
                controlSignals.aluOperation,
              inputA: alu.inputA,
              inputB: alu.inputB,
              result: alu.value,
              zero: alu.zero,
            },

      memoryAccess,
      registerWrite,
      branch,
      jump,

      datapath: {
        memoryAddress,
        signExtendedImmediate,
        shiftedImmediate,

        aluInputA:
          alu?.inputA ?? null,

        aluInputB:
          alu?.inputB ?? null,

        aluResult:
          alu?.value ?? null,

        aluZero:
          alu?.zero ?? null,

        pcCandidate,
        pcWriteEnabled,

        jumpTarget:
          jumpTargetResult?.targetPc ?? null,
      },

      instructionRetired,
      retiredInstructionCount:
        this.retiredInstructionCount,
      programComplete:
        this.isProgramComplete(),
    };
  }

  public setMemory(
    address: number,
    value: number,
  ): void {
    this.memory.writeData(
      address,
      value,
    );
  }

  public readMemory(
    address: number,
  ): number {
    return this.memory.readData(address);
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

  public getState(): MultiCycleState {
    return this.state;
  }

  public getCycleCount(): number {
    return this.cycleCount;
  }

  public getRetiredInstructionCount(): number {
    return this.retiredInstructionCount;
  }

  public readInternalRegisters():
    MultiCycleInternalRegistersSnapshot {
    return this.createInternalSnapshot();
  }

  public isProgramComplete(): boolean {
    return (
      this.state === "instruction-fetch" &&
      !this.hasInstructionAtPc(
        this.pc.read(),
      )
    );
  }

  public reset(): void {
    this.pc.reset();
    this.registers.reset();
    this.memory.resetData();

    this.instructionRegister = null;
    this.memoryDataRegister = 0;
    this.aRegister = 0;
    this.bRegister = 0;
    this.aluOutRegister = 0;

    this.state = "instruction-fetch";
    this.cycleCount = 0;
    this.retiredInstructionCount = 0;
  }

  private executeCurrentAluPath(
    controlSignals:
      MultiCycleControlSignals,
    pcBefore: number,
    signExtendedImmediate:
      number | null,
    shiftedImmediate:
      number | null,
  ): InternalAluResult | null {
    if (
      controlSignals.aluOperation === null
    ) {
      return null;
    }

    const inputA =
      this.selectAluInputA(
        controlSignals,
        pcBefore,
      );

    const inputB =
      this.selectAluInputB(
        controlSignals,
        signExtendedImmediate,
        shiftedImmediate,
      );

    const result = executeAlu(
      controlSignals.aluOperation,
      inputA,
      inputB,
    );

    return {
      ...result,
      inputA,
      inputB,
    };
  }

  private selectAluInputA(
    controlSignals:
      MultiCycleControlSignals,
    pcBefore: number,
  ): number {
    switch (controlSignals.aluSourceA) {
      case "pc":
        return pcBefore;

      case "a-register":
        return this.aRegister;

      case null:
        throw new Error(
          "An ALU operation requires ALUSrcA.",
        );
    }
  }

  private selectAluInputB(
    controlSignals:
      MultiCycleControlSignals,
    signExtendedImmediate:
      number | null,
    shiftedImmediate:
      number | null,
  ): number {
    switch (controlSignals.aluSourceB) {
      case "b-register":
        return this.bRegister;

      case "constant-four":
        return 4;

      case "sign-extended-immediate":
        return this.requireImmediate(
          signExtendedImmediate,
          "Sign-extended ALU input",
        );

      case "shifted-immediate":
        /*
         * The classic datapath computes a possible
         * branch target during decode for every
         * instruction. The structured instruction
         * model does not retain meaningless low bits
         * for R- and J-format instructions, so zero is
         * used when no immediate field exists.
         */
        return shiftedImmediate ?? 0;

      case null:
        throw new Error(
          "An ALU operation requires ALUSrcB.",
        );
    }
  }

  private selectMemoryAddress(
    controlSignals:
      MultiCycleControlSignals,
    pcBefore: number,
    aluOutBefore: number,
  ): number | null {
    switch (controlSignals.iorD) {
      case "pc":
        return pcBefore;

      case "alu-out":
        return aluOutBefore;

      case null:
        return null;
    }
  }

  private selectPcCandidate(
    controlSignals:
      MultiCycleControlSignals,
    alu: InternalAluResult | null,
    aluOutBefore: number,
    jumpTarget:
      JumpTargetResult | null,
  ): number | null {
    switch (controlSignals.pcSource) {
      case "alu-result":
        return this.requireAluResult(
          alu,
          "ALU-result PC source",
        ).value;

      case "alu-out":
        return aluOutBefore;

      case "jump-target":
        if (jumpTarget === null) {
          throw new Error(
            "Jump PC source requires a jump target.",
          );
        }

        return jumpTarget.targetPc;

      case null:
        return null;
    }
  }

  private readDecodeOperands(
    state: MultiCycleState,
    instruction: Instruction,
  ): {
    readonly sourceA:
      MultiCycleRegisterReadResult | null;

    readonly sourceB:
      MultiCycleRegisterReadResult | null;
  } {
    if (state !== "instruction-decode") {
      return {
        sourceA: null,
        sourceB: null,
      };
    }

    const registers =
      getSourceRegisters(instruction);

    return {
      sourceA:
        registers.sourceA === null
          ? null
          : {
              register: registers.sourceA,
              value: this.registers.read(
                registers.sourceA,
              ),
            },

      sourceB:
        registers.sourceB === null
          ? null
          : {
              register: registers.sourceB,
              value: this.registers.read(
                registers.sourceB,
              ),
            },
    };
  }

  private performRegisterWrite(
    instruction: Instruction,
    controlSignals:
      MultiCycleControlSignals,
    internalBefore:
      MultiCycleInternalRegistersSnapshot,
  ): MultiCycleRegisterWriteResult {
    const destination =
      selectDestinationRegister(
        instruction,
        controlSignals,
      );

    const value =
      selectRegisterWriteValue(
        controlSignals,
        internalBefore,
      );

    this.registers.write(
      destination,
      value,
    );

    return {
      register: destination,
      value,
    };
  }

  private createInternalSnapshot():
    MultiCycleInternalRegistersSnapshot {
    return {
      instructionRegister:
        this.instructionRegister,

      memoryDataRegister:
        this.memoryDataRegister,

      aRegister:
        this.aRegister,

      bRegister:
        this.bRegister,

      aluOutRegister:
        this.aluOutRegister,
    };
  }

  private requireInstructionRegister(
    state: MultiCycleState,
  ): Instruction {
    if (this.instructionRegister === null) {
      throw new Error(
        `${state} requires an instruction in IR.`,
      );
    }

    return this.instructionRegister;
  }

  private requireImmediate(
    value: number | null,
    purpose: string,
  ): number {
    if (value === null) {
      throw new Error(
        `${purpose} requires an immediate value.`,
      );
    }

    return value;
  }

  private requireAluResult(
    result: InternalAluResult | null,
    purpose: string,
  ): InternalAluResult {
    if (result === null) {
      throw new Error(
        `${purpose} requires an ALU result.`,
      );
    }

    return result;
  }

  private hasInstructionAtPc(
    pc: number,
  ): boolean {
    if (
      !Number.isInteger(pc) ||
      pc < 0 ||
      pc % BYTES_PER_INSTRUCTION !== 0
    ) {
      return false;
    }

    return (
      pc / BYTES_PER_INSTRUCTION <
      this.instructionCount
    );
  }
}

interface InternalAluResult
  extends AluResult {
  readonly inputA: number;
  readonly inputB: number;
}

function getImmediate(
  instruction: Instruction,
): number | null {
  return "immediate" in instruction
    ? instruction.immediate
    : null;
}

function getSourceRegisters(
  instruction: Instruction,
): {
  readonly sourceA: number | null;
  readonly sourceB: number | null;
} {
  switch (instruction.operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
    case "lw":
    case "sw":
    case "beq":
      return {
        sourceA: instruction.rs,
        sourceB: instruction.rt,
      };

    case "j":
      return {
        sourceA: null,
        sourceB: null,
      };
  }
}

function selectDestinationRegister(
  instruction: Instruction,
  controlSignals:
    MultiCycleControlSignals,
): number {
  switch (
    controlSignals.registerDestination
  ) {
    case "rt":
      if (!("rt" in instruction)) {
        throw new Error(
          "RegDst=rt requires an instruction with an rt field.",
        );
      }

      return instruction.rt;

    case "rd":
      if (!("rd" in instruction)) {
        throw new Error(
          "RegDst=rd requires an R-format instruction.",
        );
      }

      return instruction.rd;

    case null:
      throw new Error(
        "RegWrite requires a destination selection.",
      );
  }
}

function selectRegisterWriteValue(
  controlSignals:
    MultiCycleControlSignals,
  internalBefore:
    MultiCycleInternalRegistersSnapshot,
): number {
  switch (controlSignals.registerWriteData) {
    case "alu-out":
      return internalBefore.aluOutRegister;

    case "memory-data-register":
      return internalBefore.memoryDataRegister;

    case null:
      throw new Error(
        "RegWrite requires a write-data selection.",
      );
  }
}

function retiresInstruction(
  state: MultiCycleState,
): boolean {
  switch (state) {
    case "memory-write":
    case "memory-writeback":
    case "r-type-writeback":
    case "branch":
    case "jump":
      return true;

    case "instruction-fetch":
    case "instruction-decode":
    case "memory-address":
    case "memory-read":
    case "r-type-execute":
      return false;
  }
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
      return (
        `lw $${instruction.rt}, ` +
        `${instruction.immediate}` +
        `($${instruction.rs})`
      );

    case "sw":
      return (
        `sw $${instruction.rt}, ` +
        `${instruction.immediate}` +
        `($${instruction.rs})`
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
