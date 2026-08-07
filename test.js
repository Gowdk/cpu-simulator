"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SingleCycleCpu_1 = require("./src/domain/cpu/architectures/SingleCycleCpu");
var program = [
    {
        operation: "add",
        rs: 9,
        rt: 10,
        rd: 8,
    },
];
var cpu = new SingleCycleCpu_1.SingleCycleCpu(program);
cpu.setRegister(9, 5);
cpu.setRegister(10, 10);
cpu.step();
console.log(cpu.readRegister(8)); // 15
console.log(cpu.readProgramCounter()); // 4
