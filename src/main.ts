import "./style.css";

import { SingleCycleCpu } from
  "./domain/cpu/architectures/SingleCycleCpu";
import { MultiCycleCpu } from
  "./domain/cpu/architectures/multiCycle";
import type { Instruction } from
  "./domain/cpu/instructions/Instruction";

import { createAppMarkup } from
  "./ui/appView";
import { SvgDatapathView } from
  "./ui/datapath/core";
import type { SimulationController } from
  "./ui/datapath/core";
import {
  MULTI_CYCLE_LAYOUT,
  MultiCycleSimulationController,
} from "./ui/datapath/multiCycle";
import type {
  MultiCycleComponentId,
  MultiCyclePhase,
  MultiCycleWireId,
} from "./ui/datapath/multiCycle";
import {
  SINGLE_CYCLE_LAYOUT,
  SingleCycleSimulationController,
} from "./ui/datapath/singleCycle";
import type {
  SingleCycleComponentId,
  SingleCyclePhase,
  SingleCycleWireId,
} from "./ui/datapath/singleCycle";

import { requireElement } from
  "./utils/dom";

/**
 * Architectures that can be selected in the datapath simulator.
 */
type SimulationArchitecture =
  | "single-cycle"
  | "multi-cycle";

/**
 * Initial register value displayed by the UI and applied to each CPU.
 */
export interface DemoRegisterValue {
  readonly register: number;
  readonly value: number;
}

export interface DemoMemoryValue {
  readonly address: number;
  readonly value: number;
}

/**
 * Minimum CPU operations required by the shared demonstration-state
 * initializer. Both SingleCycleCpu and MultiCycleCpu satisfy this shape.
 */
interface CpuStateSetupTarget {
  setRegister(
    register: number,
    value: number,
  ): void;

  setMemory(
    address: number,
    value: number,
  ): void;
}

/*
 * Shared datapath demonstration:
 *
 * Address 0:  lw  $8, 100($0)
 * Address 4:  lw  $9, 104($0)
 * Address 8:  add $10, $8, $9
 * Address 12: sw  $10, 108($0)
 * Address 16: beq $10, $0, 2000
 * Address 20: j   0
 *
 * Initial register values:
 * $0  = 0
 * $8  = 0
 * $9  = 0
 * $10 = 0
 *
 * Initial data memory:
 * Mem[100] = 25
 * Mem[104] = 44
 * Mem[108] = 0
 *
 * Expected behavior during each loop:
 * $8 = 25
 * $9 = 44
 * $10 = 69
 * Mem[108] = 69
 *
 * Since $10 is not equal to $0, the beq must not be taken. The jump
 * then returns the PC to address 0, allowing the simulation to repeat.
 * All data-memory addresses are word-aligned, as required by DataMemory.
 */
const demoProgram: readonly Instruction[] = [
  {
    operation: "lw",
    rs: 0,
    rt: 8,
    immediate: 100,
  },
  {
    operation: "lw",
    rs: 0,
    rt: 9,
    immediate: 104,
  },
  {
    operation: "add",
    rs: 8,
    rt: 9,
    rd: 10,
  },
  {
    operation: "sw",
    rs: 0,
    rt: 10,
    immediate: 108,
  },
  {
    operation: "beq",
    rs: 10,
    rt: 0,
    immediate: 2000,
  },
  {
    operation: "j",
    target: 0,
  },
];

const demoRegisters:
  readonly DemoRegisterValue[] = [
    {
      register: 0,
      value: 0,
    },
    {
      register: 8,
      value: 0,
    },
    {
      register: 9,
      value: 0,
    },
    {
      register: 10,
      value: 0,
    },
  ];

const demoMemory:
  readonly DemoMemoryValue[] = [
    {
      address: 100,
      value: 25,
    },
    {
      address: 104,
      value: 44,
    },
    {
      address: 108,
      value: 0,
    },
  ];

interface ApplicationElements {
  /** Selects which CPU architecture owns the simulation controls. */
  readonly architectureSelect:
    HTMLSelectElement;

  /** Text updated when the selected architecture changes. */
  readonly simulationEyebrow:
    HTMLParagraphElement;

  readonly simulationDescription:
    HTMLParagraphElement;

  readonly datapathRoot:
    HTMLElement;

  readonly stepSimulationButton:
    HTMLButtonElement;

  readonly resetSimulationButton:
    HTMLButtonElement;

  readonly simulationStatus:
    HTMLParagraphElement;
}

/**
 * Finds all static application elements after createAppMarkup() has
 * populated the #app element.
 */
function getApplicationElements(
  app: HTMLElement,
): ApplicationElements {
  return {
    architectureSelect:
      requireElement<HTMLSelectElement>(
        "#simulation-architecture",
        app,
      ),

    simulationEyebrow:
      requireElement<HTMLParagraphElement>(
        "#simulation-eyebrow",
        app,
      ),

    simulationDescription:
      requireElement<HTMLParagraphElement>(
        "#simulation-description",
        app,
      ),

    datapathRoot:
      requireElement<HTMLElement>(
        "#datapath-root",
        app,
      ),

    stepSimulationButton:
      requireElement<HTMLButtonElement>(
        "#step-cycle-button",
        app,
      ),

    resetSimulationButton:
      requireElement<HTMLButtonElement>(
        "#reset-simulation-button",
        app,
      ),

    simulationStatus:
      requireElement<HTMLParagraphElement>(
        "#simulation-status",
        app,
      ),
  };
}

/**
 * Converts the select element's untrusted string value into the
 * architecture union used by the application.
 */
function parseSimulationArchitecture(
  value: string,
): SimulationArchitecture {
  switch (value) {
    case "single-cycle":
    case "multi-cycle":
      return value;

    default:
      throw new Error(
        `Unsupported CPU architecture: ${value}`,
      );
  }
}

/**
 * Applies the same initial register and memory state to either CPU.
 * The controller invokes this function after every CPU reset.
 */
function initializeDemoState(
  cpu: CpuStateSetupTarget,
): void {
  for (const entry of demoRegisters) {
    cpu.setRegister(
      entry.register,
      entry.value,
    );
  }

  for (const entry of demoMemory) {
    cpu.setMemory(
      entry.address,
      entry.value,
    );
  }
}

/**
 * Creates and mounts the single-cycle simulator.
 *
 * SingleCycleCpu.step() executes one complete instruction. Its
 * controller then replays several pedagogical visualization phases
 * from the returned CycleResult.
 */
function createSingleCycleSimulation(
  elements: ApplicationElements,
): SimulationController {
  const cpu =
    new SingleCycleCpu(demoProgram);

  const datapathView =
    new SvgDatapathView<
      SingleCyclePhase,
      SingleCycleComponentId,
      SingleCycleWireId
    >(
      elements.datapathRoot,
      {
        ariaLabel:
          "MIPS single-cycle CPU datapath",
        panelClassName:
          "datapath-panel--single-cycle",
      },
    );

  datapathView.mount(
    SINGLE_CYCLE_LAYOUT,
  );

  return new SingleCycleSimulationController({
    cpu,
    instructionCount:
      demoProgram.length,
    view: datapathView,
    stepButton:
      elements.stepSimulationButton,
    resetButton:
      elements.resetSimulationButton,
    statusElement:
      elements.simulationStatus,
    initializeCpuState:
      () => initializeDemoState(cpu),
  });
}

/**
 * Creates and mounts the multicycle simulator.
 *
 * MultiCycleCpu.stepCycle() executes one real FSM clock cycle, so a
 * single instruction may require several presses of the step button.
 */
function createMultiCycleSimulation(
  elements: ApplicationElements,
): SimulationController {
  const cpu =
    new MultiCycleCpu(demoProgram);

  const datapathView =
    new SvgDatapathView<
      MultiCyclePhase,
      MultiCycleComponentId,
      MultiCycleWireId
    >(
      elements.datapathRoot,
      {
        ariaLabel:
          "MIPS multicycle CPU datapath",
        panelClassName:
          "datapath-panel--multi-cycle",
      },
    );

  datapathView.mount(
    MULTI_CYCLE_LAYOUT,
  );

  return new MultiCycleSimulationController({
    cpu,
    view: datapathView,
    stepButton:
      elements.stepSimulationButton,
    resetButton:
      elements.resetSimulationButton,
    statusElement:
      elements.simulationStatus,
    initializeCpuState:
      () => initializeDemoState(cpu),
  });
}

/**
 * Central architecture factory. The rest of the application can work
 * with the shared SimulationController interface instead of knowing
 * which concrete controller is active.
 */
function createSimulationController(
  architecture: SimulationArchitecture,
  elements: ApplicationElements,
): SimulationController {
  switch (architecture) {
    case "single-cycle":
      return createSingleCycleSimulation(
        elements,
      );

    case "multi-cycle":
      return createMultiCycleSimulation(
        elements,
      );
  }
}

/**
 * Keeps the simulation heading and explanation consistent with the
 * currently selected architecture.
 */
function updateSimulationDescription(
  architecture: SimulationArchitecture,
  elements: ApplicationElements,
): void {
  switch (architecture) {
    case "single-cycle":
      elements.simulationEyebrow.textContent =
        "Single-Cycle Simulation";

      elements.simulationDescription.textContent =
        "Each instruction executes in one CPU " +
        "clock cycle. The interface replays its " +
        "datapath phases for visualization.";

      return;

    case "multi-cycle":
      elements.simulationEyebrow.textContent =
        "Multicycle Simulation";

      elements.simulationDescription.textContent =
        "Each step executes one real CPU clock " +
        "cycle. An instruction may require several " +
        "steps to complete.";

      return;
  }
}

/**
 * Owns the lifecycle of the active simulation controller.
 *
 * dispose() must run before a replacement controller is initialized;
 * otherwise both controllers would remain subscribed to the same step
 * and reset buttons.
 */
function initializeCpuSimulation(
  elements: ApplicationElements,
): void {
  let activeController:
    SimulationController | null = null;

  const switchArchitecture = (): void => {
    const architecture =
      parseSimulationArchitecture(
        elements.architectureSelect.value,
      );

    /* Remove the previous controller's button listeners. */
    activeController?.dispose();

    updateSimulationDescription(
      architecture,
      elements,
    );

    /*
     * Creating the new architecture also mounts its SVG layout. The
     * view replaces the previous contents of datapathRoot.
     */
    activeController =
      createSimulationController(
        architecture,
        elements,
      );

    activeController.initialize();
  };

  elements.architectureSelect.addEventListener(
    "change",
    switchArchitecture,
  );

  /* Mount the architecture selected by appView.ts on first load. */
  switchArchitecture();
}

/**
 * Builds the static page and initializes the selected datapath
 * architecture.
 */
function initializeApplication(): void {
  const app =
    requireElement<HTMLDivElement>(
      "#app",
    );

  app.innerHTML =
    createAppMarkup(
      demoProgram,
      demoRegisters,
      demoMemory,
    );

  const elements =
    getApplicationElements(app);

  initializeCpuSimulation(
    elements,
  );
}

initializeApplication();