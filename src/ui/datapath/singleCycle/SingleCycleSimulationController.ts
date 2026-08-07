import { SingleCycleCpu } from
  "../../../domain/cpu/architectures/SingleCycleCpu";

import type {
  DatapathView,
  SimulationController,
} from "../core/types";

import {
  buildSingleCycleTrace,
  type SingleCycleFrame,
} from "./buildSingleCycleTrace";

import {
  type SingleCycleComponentId,
  type SingleCycleWireId,
} from "./singleCycleIds";

import type { SingleCyclePhase } from
  "./singleCyclePhases";

const BYTES_PER_INSTRUCTION = 4;

export interface SingleCycleSimulationControllerOptions {
  readonly cpu: SingleCycleCpu;
  readonly instructionCount: number;

  readonly view:
    DatapathView<
      SingleCyclePhase,
      SingleCycleComponentId,
      SingleCycleWireId
    >;

  readonly stepButton: HTMLButtonElement;
  readonly resetButton: HTMLButtonElement;
  readonly statusElement: HTMLElement;

  /**
   * Reapplies any demonstration-specific register or
   * memory values after cpu.reset().
   */
  readonly initializeCpuState?: () => void;
}

export class SingleCycleSimulationController
  implements SimulationController
{
  private readonly cpu: SingleCycleCpu;
  private readonly instructionCount: number;

  private readonly view:
    DatapathView<
      SingleCyclePhase,
      SingleCycleComponentId,
      SingleCycleWireId
    >;

  private readonly stepButton:
    HTMLButtonElement;

  private readonly resetButton:
    HTMLButtonElement;

  private readonly statusElement:
    HTMLElement;

  private readonly initializeCpuState:
    () => void;

  private currentTrace:
    readonly SingleCycleFrame[] = [];

  private frameIndex = -1;
  private initialized = false;

  public constructor(
    options:
      SingleCycleSimulationControllerOptions,
  ) {
    this.cpu = options.cpu;
    this.instructionCount =
      options.instructionCount;
    this.view = options.view;
    this.stepButton = options.stepButton;
    this.resetButton = options.resetButton;
    this.statusElement =
      options.statusElement;

    this.initializeCpuState =
      options.initializeCpuState ??
      (() => undefined);
  }

  public initialize(): void {
    if (this.initialized) {
      return;
    }

    this.stepButton.addEventListener(
      "click",
      this.handleStep,
    );

    this.resetButton.addEventListener(
      "click",
      this.handleReset,
    );

    this.initialized = true;
    this.reset();
  }

  public step(): void {
    if (this.hasAnotherFrame()) {
      this.renderNextFrame();
      return;
    }

    this.startNextInstruction();
  }

  public reset(): void {
    this.cpu.reset();
    this.initializeCpuState();

    this.currentTrace = [];
    this.frameIndex = -1;

    this.view.reset();

    this.stepButton.disabled = false;
    this.stepButton.textContent =
      "Start Instruction";

    this.statusElement.textContent =
      "The simulation is ready.";
  }

  private readonly handleStep =
    (): void => {
      try {
        this.step();
      } catch (error: unknown) {
        this.handleError(error);
      }
    };

  private readonly handleReset =
    (): void => {
      try {
        this.reset();
      } catch (error: unknown) {
        this.handleError(error);
      }
    };

  private startNextInstruction(): void {
    const pc =
      this.cpu.readProgramCounter();

    if (!this.hasInstructionAtPc(pc)) {
      this.finishProgram();
      return;
    }

    const cycle =
      this.cpu.step();

    this.currentTrace =
      buildSingleCycleTrace(cycle);

    this.frameIndex = -1;
    this.renderNextFrame();
  }

  private renderNextFrame(): void {
    if (!this.hasAnotherFrame()) {
      throw new Error(
        "No additional visualization frame exists.",
      );
    }

    this.frameIndex += 1;

    const frame =
      this.currentTrace[this.frameIndex];

    if (!frame) {
      throw new Error(
        `Missing frame at index ${this.frameIndex}.`,
      );
    }

    this.view.renderFrame(frame);

    this.statusElement.textContent =
      `Cycle ${frame.cycleNumber} · ` +
      `${frame.phase}: ${frame.phaseLabel} · ` +
      `${frame.assembly}`;

    this.updateStepButton();
  }

  private updateStepButton(): void {
    if (this.hasAnotherFrame()) {
      this.stepButton.textContent =
        "Next Phase";
      return;
    }

    const nextPc =
      this.cpu.readProgramCounter();

    if (this.hasInstructionAtPc(nextPc)) {
      this.stepButton.textContent =
        "Next Instruction";
      return;
    }

    this.stepButton.textContent =
      "Program Complete";
    this.stepButton.disabled = true;

    this.statusElement.textContent +=
      " · Program complete.";
  }

  private hasAnotherFrame(): boolean {
    return (
      this.frameIndex + 1 <
      this.currentTrace.length
    );
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

  private finishProgram(): void {
    this.stepButton.disabled = true;
    this.stepButton.textContent =
      "Program Complete";

    this.statusElement.textContent =
      "The program has completed. Reset the simulation to run it again.";
  }

  private handleError(
    error: unknown,
  ): void {
    const message =
      error instanceof Error
        ? error.message
        : "An unknown simulation error occurred.";

    this.stepButton.disabled = true;

    this.statusElement.textContent =
      `Simulation error: ${message}`;

    console.error(error);
  }

  public dispose(): void {
    if (!this.initialized) {
      return;
    }

    this.stepButton.removeEventListener(
      "click",
      this.handleStep,
    );

    this.resetButton.removeEventListener(
      "click",
      this.handleReset,
    );

    this.initialized = false;
  }
}
