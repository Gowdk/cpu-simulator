import {
  MultiCycleCpu,
} from "../../../domain/cpu/architectures/multiCycle/MultiCycleCpu";
import type {
  DatapathView,
  SimulationController,
} from "../core/types";
import {
  buildMultiCycleFrame,
  type MultiCycleFrame,
} from "./buildMultiCycleFrame";
import type {
  MultiCycleComponentId,
  MultiCycleWireId,
} from "./multiCycleIds";
import type {
  MultiCyclePhase,
} from "./multiCyclePhases";

export interface MultiCycleSimulationControllerOptions {
  readonly cpu: MultiCycleCpu;

  readonly view:
    DatapathView<
      MultiCyclePhase,
      MultiCycleComponentId,
      MultiCycleWireId
    >;

  readonly stepButton: HTMLButtonElement;
  readonly resetButton: HTMLButtonElement;
  readonly statusElement: HTMLElement;

  /**
   * Reapplies demonstration-specific register and memory values
   * after cpu.reset().
   */
  readonly initializeCpuState?: () => void;
}

export class MultiCycleSimulationController
  implements SimulationController
{
  private readonly cpu: MultiCycleCpu;

  private readonly view:
    DatapathView<
      MultiCyclePhase,
      MultiCycleComponentId,
      MultiCycleWireId
    >;

  private readonly stepButton:
    HTMLButtonElement;

  private readonly resetButton:
    HTMLButtonElement;

  private readonly statusElement:
    HTMLElement;

  private readonly initializeCpuState:
    () => void;

  private initialized = false;

  public constructor(
    options:
      MultiCycleSimulationControllerOptions,
  ) {
    this.cpu = options.cpu;
    this.view = options.view;
    this.stepButton = options.stepButton;
    this.resetButton = options.resetButton;
    this.statusElement = options.statusElement;

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
    if (this.cpu.isProgramComplete()) {
      this.finishProgram();
      return;
    }

    const cycle = this.cpu.stepCycle();
    const frame =
      buildMultiCycleFrame(cycle);

    this.view.renderFrame(frame);
    this.renderStatus(frame, cycle.instructionNumber);

    if (cycle.programComplete) {
      this.stepButton.disabled = true;
      this.stepButton.textContent =
        "Program Complete";

      this.statusElement.textContent +=
        " · Program complete.";

      return;
    }

    this.stepButton.textContent =
      cycle.instructionRetired
        ? "Start Next Instruction"
        : "Next Clock Cycle";
  }

  public reset(): void {
    this.cpu.reset();
    this.initializeCpuState();

    this.view.reset();

    this.stepButton.disabled = false;
    this.stepButton.textContent =
      "Start Program";

    this.statusElement.textContent =
      "The multicycle simulation is ready.";
  }

  /**
   * Required when the application switches architectures so the
   * previous controller does not retain button listeners.
   */
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

  private renderStatus(
    frame: MultiCycleFrame,
    instructionNumber: number,
  ): void {
    this.statusElement.textContent =
      `Clock cycle ${frame.cycleNumber} · ` +
      `Instruction ${instructionNumber} · ` +
      `${frame.phaseLabel} · ` +
      `${frame.assembly}`;
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
}
