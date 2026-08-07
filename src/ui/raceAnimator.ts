import type { RaceResult } from "../domain/models";
import { requireElement } from "../utils/dom";

interface RaceAnimationOptions {
  readonly maximumDurationSeconds: number;
  readonly minimumDurationSeconds: number;
}

const DEFAULT_OPTIONS: RaceAnimationOptions = {
  maximumDurationSeconds: 15,
  minimumDurationSeconds: 5,
};

function calculateAnimationDuration(
  executionTimeSeconds: number,
  slowestExecutionTimeSeconds: number,
  options: RaceAnimationOptions,
): number {
  const scaledDuration =
    (executionTimeSeconds / slowestExecutionTimeSeconds) *
    options.maximumDurationSeconds;

  return Math.max(options.minimumDurationSeconds, scaledDuration);
}

function startRacerAnimation(
  racer: HTMLElement,
  distancePixels: number,
  durationSeconds: number,
): void {
  racer.style.transitionProperty = "transform";
  racer.style.transitionTimingFunction = "linear";
  racer.style.transitionDuration = `${durationSeconds}s`;
  racer.style.transform = `translateX(${distancePixels}px)`;
}

/**
 * Animate the rendered racers while preserving the ratio between execution
 * times. Actual execution times are scaled into visible durations.
 */
export function animateRace(
  resultsContainer: HTMLElement,
  race: RaceResult,
  options: RaceAnimationOptions = DEFAULT_OPTIONS,
): void {
  const cpuARacer = requireElement<HTMLDivElement>(
    "#cpu-a-racer",
    resultsContainer,
  );
  const cpuBRacer = requireElement<HTMLDivElement>(
    "#cpu-b-racer",
    resultsContainer,
  );

  const cpuALane = cpuARacer.closest<HTMLDivElement>(".race-lane");
  const cpuBLane = cpuBRacer.closest<HTMLDivElement>(".race-lane");

  if (!cpuALane || !cpuBLane) {
    throw new Error("The race lanes could not be found.");
  }

  const cpuAAnimationDuration = race.cpuA.executionTimeSeconds;
  const cpuBAnimationDuration = race.cpuB.executionTimeSeconds;

  const cpuADistance = cpuALane.clientWidth - cpuARacer.offsetWidth;
  const cpuBDistance = cpuBLane.clientWidth - cpuBRacer.offsetWidth;

  cpuARacer.style.transition = "none";
  cpuBRacer.style.transition = "none";
  cpuARacer.style.transitionDuration =
  `${cpuAAnimationDuration}s`;

  cpuBRacer.style.transitionDuration =
    `${cpuBAnimationDuration}s`;
  cpuARacer.style.transform = "translateX(0)";
  cpuBRacer.style.transform = "translateX(0)";

  // Two frames ensure the browser paints the reset positions before movement.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      startRacerAnimation(
        cpuARacer,
        cpuADistance,
        cpuAAnimationDuration,
      );
      startRacerAnimation(
        cpuBRacer,
        cpuBDistance,
        cpuBAnimationDuration,
      );
    });
  });
}
