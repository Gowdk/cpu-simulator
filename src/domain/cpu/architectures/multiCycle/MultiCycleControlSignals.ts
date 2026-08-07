import type {
  AluOperation,
} from "../../components/alu";

export type IorDSelection =
  | "pc"
  | "alu-out";

export type AluSourceASelection =
  | "pc"
  | "a-register";

export type AluSourceBSelection =
  | "b-register"
  | "constant-four"
  | "sign-extended-immediate"
  | "shifted-immediate";

export type PcSourceSelection =
  | "alu-result"
  | "alu-out"
  | "jump-target";

export type RegisterDestinationSelection =
  | "rt"
  | "rd";

export type RegisterWriteDataSelection =
  | "alu-out"
  | "memory-data-register";

/**
 * Control word produced for one multicycle FSM state.
 *
 * null means that the signal is a don't-care during the
 * current state because the corresponding hardware path is
 * not being used.
 */
export interface MultiCycleControlSignals {
  readonly pcWrite: boolean;
  readonly pcWriteConditional: boolean;

  readonly memoryRead: boolean;
  readonly memoryWrite: boolean;
  readonly instructionRegisterWrite: boolean;

  readonly iorD: IorDSelection | null;

  readonly aluSourceA:
    AluSourceASelection | null;

  readonly aluSourceB:
    AluSourceBSelection | null;

  readonly aluOperation:
    AluOperation | null;

  readonly pcSource:
    PcSourceSelection | null;

  readonly registerWrite: boolean;

  readonly registerDestination:
    RegisterDestinationSelection | null;

  readonly registerWriteData:
    RegisterWriteDataSelection | null;
}
