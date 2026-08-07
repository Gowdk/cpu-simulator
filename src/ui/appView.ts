import type {
  Instruction,
} from "../domain/cpu/instructions/Instruction";
import { escapeHtml } from "../utils/html";

export interface RegisterDisplayValue {
  readonly register: number;
  readonly value: number;
}

export interface MemoryDisplayValue {
  readonly address: number;
  readonly value: number;
}

/**
 * Build the static application markup.
 */
export function createAppMarkup(
  program: readonly Instruction[],
  registers: readonly RegisterDisplayValue[],
  memory: readonly MemoryDisplayValue[],
): string {
  const programMarkup =
    program
      .map((instruction, index) => {
        const address = index * 4;

        const assembly =
          escapeHtml(
            formatInstruction(
              instruction,
            ),
          );

        return `
          <li class="program-instruction">
            <span class="program-address">
              ${address}
            </span>

            <code>${assembly}</code>
          </li>
        `;
      })
      .join("");

  const registerMarkup =
    registers
      .map(({ register, value }) => {
        return `
          <li class="register-value">
            <code>$${register}</code>
            <span>=</span>
            <strong>${value}</strong>
          </li>
        `;
      })
      .join("");

  const memoryMarkup =
    memory
      .filter(({ address }) =>
        address === 100 ||
        address === 104
      )
      .map(({ address, value }) => {
        return `
          <li class="memory-value">
            <code>Mem[${address}]</code>
            <span>=</span>
            <strong>${value}</strong>
          </li>
        `;
      })
      .join("");

  return `
    <main>
      <header>
        <h1>CPU Simulator</h1>

        <p>
          Step through a program and observe how
          instructions travel through different CPU
          datapath implementations.
        </p>
      </header>

      <section
        class="program-panel"
        aria-labelledby="program-heading"
      >
        <header>
          <p class="simulation-eyebrow">
            Loaded Program
          </p>

          <h2 id="program-heading">
            Program State
          </h2>
        </header>

        <div
          class="program-state-grid"
          style="
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 1rem;
            align-items: start;
          "
        >
          <section
            class="program-column"
            aria-labelledby="instructions-heading"
          >
            <h3 id="instructions-heading">
              Instructions
            </h3>

            <ol class="program-list">
              ${programMarkup}
            </ol>
          </section>

          <section
            class="register-panel"
            aria-labelledby="register-heading"
          >
            <h3 id="register-heading">
              Initial Register Values
            </h3>

            <ul class="register-list">
              ${registerMarkup}
            </ul>
          </section>

          <section
            class="memory-panel"
            aria-labelledby="memory-heading"
          >
            <h3 id="memory-heading">
              Initial Memory Values Used by LW
            </h3>

            <ul class="memory-list">
              ${memoryMarkup}
            </ul>
          </section>
        </div>
      </section>

      <section
        class="simulation-panel"
        aria-labelledby="datapath-heading"
      >
        <header class="simulation-header">
          <div>
            <p
              id="simulation-eyebrow"
              class="simulation-eyebrow"
            >
              Multicycle Simulation
            </p>

            <h2 id="datapath-heading">
              CPU Datapath
            </h2>

            <p id="simulation-description">
              Each step executes one real CPU clock
              cycle. An instruction may require several
              steps to complete.
            </p>
          </div>

          <div
            class="simulation-controls"
            aria-label="Simulation controls"
          >
            <div class="simulation-architecture-control">
              <label for="simulation-architecture">
                Architecture
              </label>

              <select
                id="simulation-architecture"
                name="simulationArchitecture"
              >
                <option value="multi-cycle">
                  Multicycle
                </option>

                <option value="single-cycle">
                  Single-cycle
                </option>
              </select>
            </div>

            <button
              id="step-cycle-button"
              type="button"
            >
              Step Cycle
            </button>

            <button
              id="reset-simulation-button"
              type="button"
            >
              Reset Simulation
            </button>
          </div>
        </header>

        <p
          id="simulation-status"
          class="simulation-status"
          aria-live="polite"
        >
          The simulation is ready.
        </p>

        <section
          id="datapath-root"
          class="datapath-root"
          aria-live="polite"
        >
          <p class="results-placeholder">
            The datapath will appear here.
          </p>
        </section>
      </section>
    </main>
  `;
}

/**
 * Formats a structured instruction as assembly for display.
 */
function formatInstruction(
  instruction: Instruction,
): string {
  switch (instruction.operation) {
    case "add":
    case "sub":
    case "and":
    case "or":
      return (
        `${instruction.operation} ` +
        `$${instruction.rd}, ` +
        `$${instruction.rs}, ` +
        `$${instruction.rt}`
      );

    case "lw":
    case "sw":
      return (
        `${instruction.operation} ` +
        `$${instruction.rt}, ` +
        `${instruction.immediate}` +
        `($${instruction.rs})`
      );

    case "beq":
      return (
        `beq $${instruction.rs}, ` +
        `$${instruction.rt}, ` +
        `${instruction.immediate}`
      );

    case "j":
      return `j ${instruction.target}`;
  }
}
