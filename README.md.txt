README.md

Heirarchy:
src/
├── domain/
│   └── cpu/
│       ├── architectures/
│       │   ├── SingleCycleCpu.ts
│       │   ├── singleCycleDecoder.ts
│       │   │
│       │   └── multiCycle/
│       │       ├── MultiCycleCpu.ts
│       │       ├── MultiCycleState.ts
│       │       ├── MultiCycleControlSignals.ts
│       │       ├── generateMultiCycleControl.ts
│       │       ├── getNextMultiCycleState.ts
│       │       ├── MultiCycleCycleResult.ts
│       │       └── MultiCycleMemory.ts
│       │
│       ├── components/
│       │   ├── adder.ts
│       │   ├── alu.ts
│       │   ├── controlUnit.ts
│       │   ├── CreateJumpTarget.ts
│       │   ├── DataMemory.ts
│       │   ├── InstructionMemory.ts
│       │   ├── mux.ts
│       │   ├── ProgramCounter.ts
│       │   ├── RegisterFile.ts
│       │   ├── shiftLeftTwice.ts
│       │   └── signExtension.ts
│       │
│       ├── instructions/
│       │   └── Instruction.ts
│       │
│       ├── CycleResult.ts
│       └── index.ts
│
├── ui/
│   ├── datapath/
│   │   ├── core/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── svgDatapathScene.ts
│   │   │   └── SvgDatapathView.ts
│   │   │
│   │   ├── singleCycle/
│   │   │   ├── buildSingleCycleTrace.ts
│   │   │   ├── index.ts
│   │   │   ├── singleCycleIds.ts
│   │   │   ├── singleCycleLayout.ts
│   │   │   ├── singleCyclePhases.ts
│   │   │   └── SingleCycleSimulationController.ts
│   │   │
│   │   └── multiCycle/
│   │       ├── buildMultiCycleFrame.ts
│   │       ├── index.ts
│   │       ├── multiCycleIds.ts
│   │       ├── multiCycleLayout.ts
│   │       ├── multiCyclePhases.ts
│   │       └── MultiCycleSimulationController.ts
│   │
│   ├── appView.ts
│   └── ...
│
├── main.ts
└── style.css