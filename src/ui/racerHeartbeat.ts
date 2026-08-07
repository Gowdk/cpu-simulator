import type { RaceResult } from "../domain/models";

const BASE_HEARTBEAT_INTERVAL_MS = 500;
const HEARTBEAT_DURATION_MS = 50;

/**
 * Converts the CPU's actual clock rate into a visually observable
 * heartbeat interval.
 *
 * Example:
 * 1 GHz -> 500 ms
 * 2 GHz -> 250 ms
 * 4 GHz -> 125 ms
 */
function calculateHeartbeatInterval(
  clockRateGHz: number,
): number {
  return BASE_HEARTBEAT_INTERVAL_MS / clockRateGHz;
}

function startHeartbeatForRacer(
  racer: HTMLElement,
  clockRateGHz: number,
  executionTimeSeconds: number,
): () => void {
  let heartbeatTimeoutId: number | null = null;

  const heartbeatIntervalMs =
    calculateHeartbeatInterval(clockRateGHz);

  const pulse = (): void => {
    racer.classList.add("heartbeat");

    heartbeatTimeoutId = window.setTimeout(() => {
      racer.classList.remove("heartbeat");
    }, HEARTBEAT_DURATION_MS);
  };

  const intervalId = window.setInterval(
    pulse,
    heartbeatIntervalMs,
  );

  const stopTimeoutId = window.setTimeout(() => {
    window.clearInterval(intervalId);

    if (heartbeatTimeoutId !== null) {
      window.clearTimeout(heartbeatTimeoutId);
    }

    racer.classList.remove("heartbeat");
  }, executionTimeSeconds * 1000);

  return () => {
    window.clearInterval(intervalId);
    window.clearTimeout(stopTimeoutId);

    if (heartbeatTimeoutId !== null) {
      window.clearTimeout(heartbeatTimeoutId);
    }

    racer.classList.remove("heartbeat");
  };
}

export function startRacerHeartbeat(
  container: HTMLElement,
  race: RaceResult,
): () => void {
  const cpuARacer =
    container.querySelector<HTMLElement>("#cpu-a-racer");

  const cpuBRacer =
    container.querySelector<HTMLElement>("#cpu-b-racer");

  if (!cpuARacer || !cpuBRacer) {
    throw new Error("The CPU racers could not be found.");
  }

  const stopCpuAHeartbeat = startHeartbeatForRacer(
    cpuARacer,
    race.cpuA.specification.clockRateGHz,
    race.cpuA.executionTimeSeconds,
  );

  const stopCpuBHeartbeat = startHeartbeatForRacer(
    cpuBRacer,
    race.cpuB.specification.clockRateGHz,
    race.cpuB.executionTimeSeconds,
  );

  return () => {
    stopCpuAHeartbeat();
    stopCpuBHeartbeat();
  };
}