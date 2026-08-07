export const REGISTER_OPERATIONS = [
  "add",
  "sub",
  "and",
  "or",
] as const;

export const IMMEDIATE_OPERATIONS = [
  "lw",
  "sw",
  "beq",
] as const;


export const JUMP_OPERATIONS = [
  "j",
] as const;


export type RegisterOperation = (typeof REGISTER_OPERATIONS)[number];
export type ImmediateOperation = (typeof IMMEDIATE_OPERATIONS)[number];
export type JumpOperation = (typeof JUMP_OPERATIONS)[number];

export interface RegisterInstruction {
  /*
    Required Hardware:
    1- PC
    2- Instruction Memory
    3- Register File
    4- ALU
  */
  readonly operation: RegisterOperation;
  readonly rs: number;
  readonly rt: number;
  readonly rd: number;
}

export interface ImmediateInstruction {
  /*
    Required Hardware:
    1- PC
    2- Instruction Memory
    3- Register File
    4- ALU
    5- Data Memory
    6- Sign Extension
    7- 
  */
  readonly operation: ImmediateOperation;
  readonly rs: number;
  readonly rt: number;
  readonly immediate: number;
}


export interface JumpInstruction {
  readonly operation: JumpOperation;
  readonly target: number;
}


// Type enforcement
export type Instruction =
  | RegisterInstruction
  | ImmediateInstruction
  | JumpInstruction;
