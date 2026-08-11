import {
  PipelinedCpu,
} from "../../../domain/cpu/architectures/pipelined/PipelinedCpu";

import type {
  Instruction,
} from "../../../domain/cpu/instructions/Instruction";

import {
  SvgDatapathView,
} from "../core/SvgDatapathView";

import {
  PipelinedSimulationController,
} from "./PipelinedSimulationController";

import {
  PIPELINED_LAYOUT,
} from "./pipelinedLayout";

import type {
  PipelinedComponentId,
  PipelinedWireId,
} from "./pipelinedIds";

import type {
  PipelinedPhase,
} from "./pipelinedPhases";

export interface CreatePipelinedSimulationOptions {
  readonly program:
    readonly Instruction[];

  readonly datapathRoot: HTMLElement;

  readonly stepButton:
    HTMLButtonElement;

  readonly resetButton:
    HTMLButtonElement;

  readonly statusElement:
    HTMLElement;

  /**
   * Applies demonstration-specific architectural state.
   *
   * This callback is invoked once during controller initialization and
   * again after every reset, matching the initialization pattern used
   * by the existing single-cycle and multicycle controllers.
   */
  readonly initializeCpuState?:
    (cpu: PipelinedCpu) => void;
}

export interface PipelinedSimulation {
  readonly cpu: PipelinedCpu;

  readonly view:
    SvgDatapathView<
      PipelinedPhase,
      PipelinedComponentId,
      PipelinedWireId
    >;

  readonly controller:
    PipelinedSimulationController;

  /**
   * Removes event listeners owned by the simulation controller.
   *
   * Call this before mounting another architecture into the same UI.
   */
  dispose(): void;
}

/**
 * App-level integration boundary for the pipelined architecture.
 *
 * Consumers only provide the program and existing simulation DOM
 * elements. This function owns the pipeline-specific CPU/view/controller
 * wiring so main.ts/appView.ts do not need to know about the datapath's
 * implementation details.
 */
export function createPipelinedSimulation(
  options:
    CreatePipelinedSimulationOptions,
): PipelinedSimulation {
  const cpu =
    new PipelinedCpu(options.program);

  const view =
    new SvgDatapathView<
      PipelinedPhase,
      PipelinedComponentId,
      PipelinedWireId
    >(
      options.datapathRoot,
      {
        ariaLabel:
          "Five-stage pipelined CPU datapath visualization",

        panelClassName:
          "datapath-panel--pipelined",
      },
    );

  view.mount(PIPELINED_LAYOUT);

  const initializeCpuState =
    (): void => {
      options.initializeCpuState?.(cpu);
    };

  const controller =
    new PipelinedSimulationController({
      cpu,
      view,
      stepButton:
        options.stepButton,
      resetButton:
        options.resetButton,
      statusElement:
        options.statusElement,
      initializeCpuState,
    });

  controller.initialize();

  return {
    cpu,
    view,
    controller,

    dispose(): void {
      controller.dispose();
    },
  };
}
