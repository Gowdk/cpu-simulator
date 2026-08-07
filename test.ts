import { SingleCycleCpu } from "./src/domain/cpu/architectures/SingleCycleCpu";

import type { Instruction } from
  "./src/domain/cpu/instructions/Instruction";

const program: readonly Instruction[] = [
  {
    operation: "add",
    rs: 9,
    rt: 10,
    rd: 8,
  },
];

const cpu = new SingleCycleCpu(program);

cpu.setRegister(9, 5);
cpu.setRegister(10, 10);

const cycle = cpu.step();

console.log(cycle);