export type AluOperation =
  | "ADD"
  | "SUBTRACT"
  | "AND"
  | "OR";

export interface AluResult {
  readonly value: number;
  readonly zero: boolean;
}

export function executeAlu(operation: AluOperation, inputA: number, inputB: number): AluResult {
  let value: number;

  switch (operation) {
    case "ADD":
      value = inputA + inputB;
      break;

    case "SUBTRACT":
      value = inputA - inputB;
      break;

    case "AND":
      value = inputA & inputB;
      break;

    case "OR":
      value = inputA | inputB;
      break;
  }

  return {
    value,
    zero: value === 0,
  };
}