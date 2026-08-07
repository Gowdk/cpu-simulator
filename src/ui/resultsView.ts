import type { CpuPerformance, RaceResult } from "../domain/models";
import { calculateRelativePerformance } from "../domain/performance";
import { formatCycles, formatExecutionTime } from "../utils/format";
import { escapeHtml } from "../utils/html";

function createCpuCard(
  cpu: CpuPerformance,
  opponent: CpuPerformance,
): string {
  const specification = cpu.specification;
  const safeCpuName = escapeHtml(specification.name);
  const safeOpponentName = escapeHtml(opponent.specification.name);
  const relativePerformance = calculateRelativePerformance(cpu, opponent);

  return `
    <section class="cpu-card result-card">
      <h2>${safeCpuName}</h2>

      <div class="metric">
        <span class="metric-label">Clock Rate</span>
        <span class="metric-value">
          ${specification.clockRateGHz.toFixed(2)} GHz
        </span>
      </div>

      <div class="metric">
        <span class="metric-label">CPI</span>
        <span class="metric-value">
          ${specification.cyclesPerInstruction.toFixed(2)}
        </span>
      </div>

      <div class="metric">
        <span class="metric-label">Total Cycles</span>
        <span class="metric-value">
          ${formatCycles(cpu.totalCycles)}
        </span>
      </div>

      <div class="metric">
        <span class="metric-label">Execution Time</span>
        <span
          class="metric-value"
          title="${cpu.executionTimeSeconds} seconds"
        >
          ${formatExecutionTime(cpu.executionTimeSeconds)}
        </span>
      </div>

      <div class="speedup">
        <span>Relative performance vs. ${safeOpponentName}</span>
        <strong>${relativePerformance.toFixed(3)}×</strong>
      </div>
    </section>
  `;
}

function createWinnerMarkup(race: RaceResult): string {
  if (race.isTie) {
    return `
      <section class="winner">
        <h2>The race is a tie</h2>
        <p>
          Both CPUs have an execution time of
          ${formatExecutionTime(race.cpuA.executionTimeSeconds)}.
        </p>
      </section>
    `;
  }

  const winnerName = escapeHtml(race.winner.specification.name);
  const loserName = escapeHtml(race.loser.specification.name);
  const programName = escapeHtml(race.program.name);

  return `
    <section class="winner">
      <h2>${winnerName} wins!</h2>
      <p>
        It executes ${programName}
        ${race.winningSpeedup.toFixed(3)}× faster than
        ${loserName}.
      </p>
    </section>
  `;
}

/** Replace the result region with the completed race comparison. */
export function renderResults(
  container: HTMLElement,
  race: RaceResult,
): void {
  container.innerHTML = `
    ${createWinnerMarkup(race)}

    <section class="race">
      <div class="race-lane">
        <div id="cpu-a-racer" class="cpu-racer">
          ${escapeHtml(race.cpuA.specification.name)}
        </div>
      </div>

      <div class="race-lane">
        <div id="cpu-b-racer" class="cpu-racer">
          ${escapeHtml(race.cpuB.specification.name)}
        </div>
      </div>
    </section>

    <div class="container comparison-container">
      ${createCpuCard(race.cpuA, race.cpuB)}
      ${createCpuCard(race.cpuB, race.cpuA)}
    </div>
  `;
}
