import type { RaceConfiguration } from "../domain/models";

const MIN_EXECUTION_TIME_US = 5_000_000_000;   // 5 seconds
const MAX_EXECUTION_TIME_US = 15_000_000_000;  // 15 seconds

const FIELD_NAMES = {
  cpuAName: "cpuAName",
  cpuAClockRate: "cpuAClockRate",
  cpuACyclesPerInstruction: "cpuACyclesPerInstruction",
  cpuBName: "cpuBName",
  cpuBClockRate: "cpuBClockRate",
  cpuBCyclesPerInstruction: "cpuBCyclesPerInstruction",
  instructionCount: "instructionCount",
} as const;

export type FormParseResult =
  | {
      readonly ok: true;
      readonly value: RaceConfiguration;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

function readText(data: FormData, fieldName: string): string {
  return String(data.get(fieldName) ?? "").trim();
}

function readNumber(data: FormData, fieldName: string): number {
  return Number(data.get(fieldName));
}

/** Read and validate all user-entered race values in one place. */
export function parseRaceForm(
  form: HTMLFormElement,
  programName: string,
): FormParseResult {
  const data = new FormData(form);

  const cpuAName = readText(data, FIELD_NAMES.cpuAName);
  const cpuBName = readText(data, FIELD_NAMES.cpuBName);

  if (!cpuAName || !cpuBName) {
    return {
      ok: false,
      message: "Both CPUs must have a name.",
    };
  }

  const cpuAClockRate = readNumber(data, FIELD_NAMES.cpuAClockRate);
  const cpuACyclesPerInstruction = readNumber(
    data,
    FIELD_NAMES.cpuACyclesPerInstruction,
  );
  const cpuBClockRate = readNumber(data, FIELD_NAMES.cpuBClockRate);
  const cpuBCyclesPerInstruction = readNumber(
    data,
    FIELD_NAMES.cpuBCyclesPerInstruction,
  );
  const instructionCount = readNumber(data, FIELD_NAMES.instructionCount);

  const cpuATotalCycles = cpuACyclesPerInstruction * instructionCount;
  const cpuBTotalCycles = cpuBCyclesPerInstruction * instructionCount;

  const cpuAExecTime = cpuATotalCycles / cpuAClockRate;
  const cpuBExecTime = cpuBTotalCycles / cpuBClockRate; 

  // Hey look ma I made it
  const minExecTime = (cpuAExecTime < cpuBExecTime) ? cpuAExecTime : cpuBExecTime; 
  const maxExecTime = (cpuAExecTime > cpuBExecTime) ? cpuAExecTime : cpuBExecTime;

  const numericalValues = [
    cpuAClockRate,
    cpuACyclesPerInstruction,
    cpuBClockRate,
    cpuBCyclesPerInstruction,
    instructionCount,
  ];

  const hasInvalidNumber = numericalValues.some(
    (value) => !Number.isFinite(value) || value <= 0,
  );

  if (hasInvalidNumber) {
    return {
      ok: false,
      message:
        "Clock rate, CPI, and instruction count must be greater than zero.",
    };
  }

  if (!Number.isInteger(instructionCount)) {
    return {
      ok: false,
      message: "The instruction count must be a whole number.",
    };
  }

  if (minExecTime < MIN_EXECUTION_TIME_US || maxExecTime > MAX_EXECUTION_TIME_US) {
    return {
      ok: false,
      message: "Execution times must be between " +
              `${MIN_EXECUTION_TIME_US/1_000_000_000}-${MAX_EXECUTION_TIME_US/1_000_000_000} seconds.`,  
    }
  }

  return {
    ok: true,
    value: {
      cpuA: {
        name: cpuAName,
        clockRateGHz: cpuAClockRate,
        cyclesPerInstruction: cpuACyclesPerInstruction,
      },
      cpuB: {
        name: cpuBName,
        clockRateGHz: cpuBClockRate,
        cyclesPerInstruction: cpuBCyclesPerInstruction,
      },
      program: {
        name: programName,
        instructionCount,
      },
    },
  };
}

/** Keep error presentation separate from validation and parsing. */
export function renderFormError(
  errorElement: HTMLElement,
  message: string,
): void {
  errorElement.textContent = message;
}
