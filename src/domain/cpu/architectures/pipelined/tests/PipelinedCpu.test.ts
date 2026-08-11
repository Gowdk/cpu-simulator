import {
  describe,
  expect,
  it,
} from "vitest";

import { PipelinedCpu } from "../PipelinedCpu";
import type {
  PipelinedCycleResult,
} from "../PipelinedCycleResult";
import type {
  Instruction,
} from "../../../instructions/Instruction";

function runUntilHalted(
  cpu: PipelinedCpu,
  maxCycles = 100,
): PipelinedCycleResult[] {
  const results: PipelinedCycleResult[] = [];

  while (!cpu.isHalted()) {
    if (results.length >= maxCycles) {
      throw new Error(
        `CPU did not halt within ${maxCycles} cycles.`,
      );
    }

    results.push(cpu.step());
  }

  return results;
}

describe("PipelinedCpu", () => {
  it("fills and drains the five-stage pipeline", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 1,
      },
      {
        operation: "add",
        rs: 5,
        rt: 6,
        rd: 4,
      },
      {
        operation: "add",
        rs: 8,
        rt: 9,
        rd: 7,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);
    cpu.setRegister(5, 7);
    cpu.setRegister(6, 8);
    cpu.setRegister(8, 1);
    cpu.setRegister(9, 2);

    const cycles =
      runUntilHalted(cpu);

    /*
     * Three hazard-free instructions take:
     *
     * N + 4 = 3 + 4 = 7 cycles
     *
     * to fill and completely drain a five-stage pipeline.
     */
    expect(cycles).toHaveLength(7);

    expect(
      cycles[0].next.ifId?.instruction,
    ).toEqual(program[0]);

    expect(
      cycles[1].next.idEx?.instruction,
    ).toEqual(program[0]);

    expect(
      cycles[1].next.ifId?.instruction,
    ).toEqual(program[1]);

    expect(
      cycles[2].next.exMem?.instruction,
    ).toEqual(program[0]);

    expect(
      cycles[2].next.idEx?.instruction,
    ).toEqual(program[1]);

    expect(
      cycles[2].next.ifId?.instruction,
    ).toEqual(program[2]);

    const finalCycle =
      cycles[cycles.length - 1];

    expect(finalCycle.next.ifId).toBeNull();
    expect(finalCycle.next.idEx).toBeNull();
    expect(finalCycle.next.exMem).toBeNull();
    expect(finalCycle.next.memWb).toBeNull();

    expect(cpu.isHalted()).toBe(true);

    expect(cpu.readRegister(1)).toBe(30);
    expect(cpu.readRegister(4)).toBe(15);
    expect(cpu.readRegister(7)).toBe(3);
  });

  it("forwards the newest result from EX/MEM", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 1,
      },
      {
        operation: "add",
        rs: 1,
        rt: 5,
        rd: 4,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);
    cpu.setRegister(5, 7);

    cpu.step();
    cpu.step();
    cpu.step();

    const forwardingCycle = cpu.step();

    expect(
      forwardingCycle.forwarding,
    ).toEqual({
      forwardA: "EX_MEM",
      forwardB: "REGISTER",
    });

    runUntilHalted(cpu);

    expect(cpu.readRegister(1)).toBe(30);
    expect(cpu.readRegister(4)).toBe(37);
  });

  it("forwards an older result from MEM/WB", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 1,
      },
      {
        operation: "add",
        rs: 8,
        rt: 9,
        rd: 7,
      },
      {
        operation: "add",
        rs: 1,
        rt: 5,
        rd: 4,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);
    cpu.setRegister(5, 7);
    cpu.setRegister(8, 1);
    cpu.setRegister(9, 2);

    cpu.step();
    cpu.step();
    cpu.step();
    cpu.step();

    const forwardingCycle = cpu.step();

    expect(
      forwardingCycle.forwarding,
    ).toEqual({
      forwardA: "MEM_WB",
      forwardB: "REGISTER",
    });

    runUntilHalted(cpu);

    expect(cpu.readRegister(4)).toBe(37);
  });

  it("gives EX/MEM forwarding priority over MEM/WB", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 1,
      },
      {
        operation: "add",
        rs: 1,
        rt: 4,
        rd: 1,
      },
      {
        operation: "add",
        rs: 1,
        rt: 6,
        rd: 5,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);
    cpu.setRegister(4, 5);
    cpu.setRegister(6, 7);

    cpu.step();
    cpu.step();
    cpu.step();
    cpu.step();

    const forwardingCycle = cpu.step();

    expect(
      forwardingCycle.forwarding?.forwardA,
    ).toBe("EX_MEM");

    runUntilHalted(cpu);

    /*
     * I1: $1 = 30
     * I2: $1 = 35
     * I3 must use I2's newer 35, not I1's stale 30.
     */
    expect(cpu.readRegister(1)).toBe(35);
    expect(cpu.readRegister(5)).toBe(42);
  });

  it("forwards register B into the SW store-data path", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 1,
      },
      {
        operation: "sw",
        rs: 4,
        rt: 1,
        immediate: 0,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);
    cpu.setRegister(4, 100);

    cpu.step();
    cpu.step();
    cpu.step();

    const forwardingCycle = cpu.step();

    expect(
      forwardingCycle.forwarding,
    ).toEqual({
      forwardA: "REGISTER",
      forwardB: "EX_MEM",
    });

    runUntilHalted(cpu);

    expect(cpu.readMemory(100)).toBe(30);
  });

  it("stalls exactly one cycle for an immediate load-use hazard", () => {
    const program = [
      {
        operation: "lw",
        rs: 2,
        rt: 1,
        immediate: 0,
      },
      {
        operation: "add",
        rs: 1,
        rt: 4,
        rd: 3,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 100);
    cpu.setRegister(4, 5);
    cpu.setMemory(100, 7);

    cpu.step();
    cpu.step();

    const stallCycle = cpu.step();

    expect(stallCycle.hazard).toEqual({
      stallPc: true,
      stallIfId: true,
      bubbleIdEx: true,
    });

    /*
     * The PC and IF/ID register freeze while ID/EX receives a bubble.
     */
    expect(stallCycle.pcBefore).toBe(8);
    expect(stallCycle.pcAfter).toBe(8);

    expect(
      stallCycle.next.ifId?.instruction,
    ).toEqual(program[1]);

    expect(stallCycle.next.idEx).toBeNull();

    /*
     * After one bubble, the dependent ADD reaches EX while LW is in
     * MEM/WB, so the loaded value can now be forwarded.
     */
    cpu.step();
    const forwardingCycle = cpu.step();

    expect(
      forwardingCycle.forwarding?.forwardA,
    ).toBe("MEM_WB");

    const remainingCycles =
      runUntilHalted(cpu);

    /*
     * Two instructions normally require 6 cycles.
     * The load-use bubble increases that to 7.
     *
     * Five cycles have already been executed above.
     */
    expect(
      5 + remainingCycles.length,
    ).toBe(7);

    expect(cpu.readRegister(1)).toBe(7);
    expect(cpu.readRegister(3)).toBe(12);
  });

  it("redirects the PC and flushes both younger instructions for a taken BEQ", () => {
    const program = [
      {
        operation: "beq",
        rs: 1,
        rt: 2,
        immediate: 2,
      },
      {
        operation: "add",
        rs: 4,
        rt: 5,
        rd: 3,
      },
      {
        operation: "add",
        rs: 7,
        rt: 8,
        rd: 6,
      },
      {
        operation: "add",
        rs: 10,
        rt: 11,
        rd: 9,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(1, 42);
    cpu.setRegister(2, 42);

    cpu.setRegister(4, 10);
    cpu.setRegister(5, 20);

    cpu.setRegister(7, 30);
    cpu.setRegister(8, 40);

    cpu.setRegister(10, 50);
    cpu.setRegister(11, 60);

    cpu.step();
    cpu.step();

    const branchCycle = cpu.step();

    expect(branchCycle.controlTransfer).toMatchObject({
      type: "branch",
      taken: true,
      targetPc: 12,
    });

    expect(branchCycle.controlHazard).toEqual({
      redirectPc: true,
      flushIfId: true,
      flushIdEx: true,
    });

    expect(branchCycle.pcAfter).toBe(12);
    expect(branchCycle.next.ifId).toBeNull();
    expect(branchCycle.next.idEx).toBeNull();

    runUntilHalted(cpu);

    /*
     * The two sequential younger instructions must never commit.
     * Only the instruction at the branch target should execute.
     */
    expect(cpu.readRegister(3)).toBe(0);
    expect(cpu.readRegister(6)).toBe(0);
    expect(cpu.readRegister(9)).toBe(110);
  });

  it("does not flush or redirect for an untaken BEQ", () => {
    const program = [
      {
        operation: "beq",
        rs: 1,
        rt: 2,
        immediate: 2,
      },
      {
        operation: "add",
        rs: 4,
        rt: 5,
        rd: 3,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(1, 1);
    cpu.setRegister(2, 2);
    cpu.setRegister(4, 10);
    cpu.setRegister(5, 20);

    cpu.step();
    cpu.step();

    const branchCycle = cpu.step();

    expect(
      branchCycle.controlTransfer,
    ).toBeNull();

    expect(branchCycle.controlHazard).toEqual({
      redirectPc: false,
      flushIfId: false,
      flushIdEx: false,
    });

    expect(
      branchCycle.next.idEx?.instruction,
    ).toEqual(program[1]);

    runUntilHalted(cpu);

    expect(cpu.readRegister(3)).toBe(30);
  });

  it("redirects and flushes younger instructions for J", () => {
    const program = [
      {
        operation: "j",
        target: 3,
      },
      {
        operation: "add",
        rs: 4,
        rt: 5,
        rd: 3,
      },
      {
        operation: "add",
        rs: 7,
        rt: 8,
        rd: 6,
      },
      {
        operation: "add",
        rs: 10,
        rt: 11,
        rd: 9,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(4, 10);
    cpu.setRegister(5, 20);

    cpu.setRegister(7, 30);
    cpu.setRegister(8, 40);

    cpu.setRegister(10, 50);
    cpu.setRegister(11, 60);

    cpu.step();
    cpu.step();

    const jumpCycle = cpu.step();

    expect(jumpCycle.controlTransfer).toMatchObject({
      type: "jump",
      targetPc: 12,
    });

    expect(jumpCycle.controlHazard).toEqual({
      redirectPc: true,
      flushIfId: true,
      flushIdEx: true,
    });

    expect(jumpCycle.pcAfter).toBe(12);
    expect(jumpCycle.next.ifId).toBeNull();
    expect(jumpCycle.next.idEx).toBeNull();

    runUntilHalted(cpu);

    expect(cpu.readRegister(3)).toBe(0);
    expect(cpu.readRegister(6)).toBe(0);
    expect(cpu.readRegister(9)).toBe(110);
  });

  it("never forwards to or writes MIPS $zero", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 0,
      },
      {
        operation: "add",
        rs: 0,
        rt: 5,
        rd: 4,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);
    cpu.setRegister(5, 7);

    cpu.step();
    cpu.step();
    cpu.step();

    const forwardingCycle = cpu.step();

    expect(
      forwardingCycle.forwarding?.forwardA,
    ).toBe("REGISTER");

    runUntilHalted(cpu);

    expect(cpu.readRegister(0)).toBe(0);
    expect(cpu.readRegister(4)).toBe(7);
  });

  it("does not report halted merely because instruction fetch is finished", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 1,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);

    /*
     * Cycle 1 fetches the only instruction. PC now points beyond
     * instruction memory, but the instruction still needs four more
     * stage transitions before the pipeline is empty.
     */
    cpu.step();

    expect(cpu.readProgramCounter()).toBe(4);
    expect(cpu.isHalted()).toBe(false);

    cpu.step();
    cpu.step();
    cpu.step();

    /*
     * The instruction is now in MEM/WB, so the CPU still is not halted.
     */
    expect(cpu.isHalted()).toBe(false);

    cpu.step();

    expect(cpu.isHalted()).toBe(true);
    expect(cpu.readRegister(1)).toBe(30);
  });

  it("preserves WB-before-ID register-file behavior", () => {
    const program = [
      {
        operation: "add",
        rs: 2,
        rt: 3,
        rd: 1,
      },
      {
        operation: "add",
        rs: 8,
        rt: 9,
        rd: 7,
      },
      {
        operation: "add",
        rs: 10,
        rt: 11,
        rd: 6,
      },
      {
        operation: "add",
        rs: 1,
        rt: 5,
        rd: 4,
      },
    ] as const satisfies readonly Instruction[];

    const cpu = new PipelinedCpu(program);

    cpu.setRegister(2, 10);
    cpu.setRegister(3, 20);
    cpu.setRegister(5, 7);

    cpu.setRegister(8, 1);
    cpu.setRegister(9, 2);

    cpu.setRegister(10, 3);
    cpu.setRegister(11, 4);

    const cycles =
      runUntilHalted(cpu);

    /*
     * When I1 is in WB, I4 is in ID. WB executes first in step(), so
     * I4's ID-stage register read should observe $1 = 30 directly.
     *
     * By the time I4 reaches EX there is no matching value left in
     * EX/MEM or MEM/WB, so the operand must come from its stored
     * register-file value rather than forwarding.
     */
    const i4ExCycle =
      cycles.find(
        (cycle) =>
          cycle.current.idEx?.instruction ===
          program[3],
      );

    expect(i4ExCycle).toBeDefined();

    expect(
      i4ExCycle?.forwarding?.forwardA,
    ).toBe("REGISTER");

    expect(
      i4ExCycle?.current.idEx
        ?.sourceAValue,
    ).toBe(30);

    expect(cpu.readRegister(4)).toBe(37);
  });
});
