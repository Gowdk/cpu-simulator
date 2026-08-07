import {
  createSvgDatapathScene,
  type SvgDatapathScene,
} from "./svgDatapathScene";

import type {
  DatapathFrame,
  DatapathLayout,
  DatapathView,
} from "./types";

const DEFAULT_ARIA_LABEL =
  "CPU datapath visualization";

const COMPONENT_VALUE_LINE_HEIGHT = 16;
const COMPONENT_VALUE_LINE_LENGTH = 34;

export interface SvgDatapathViewOptions {
  /** Accessible name used before the first frame is rendered. */
  readonly ariaLabel?: string;

  /** Additional class names placed on the generated panel. */
  readonly panelClassName?: string;
}

/**
 * Architecture-independent SVG datapath view.
 *
 * The view renders declarative layout data and applies immutable frames. It
 * does not decode instructions or decide which components and wires are active.
 */
export class SvgDatapathView<
  TPhase extends string,
  TComponentId extends string,
  TWireId extends string,
> implements DatapathView<
    TPhase,
    TComponentId,
    TWireId
  >
{
  private readonly root: HTMLElement;
  private readonly ariaLabel: string;
  private readonly panelClassNames:
    readonly string[];

  private scene:
    SvgDatapathScene<
      TComponentId,
      TWireId
    > | null = null;

  private readonly activeComponentIds =
    new Set<TComponentId>();

  private readonly activeWireIds =
    new Set<TWireId>();

  private phaseCodeElement: HTMLElement | null = null;
  private phaseTitleElement: HTMLElement | null = null;
  private phaseDescriptionElement: HTMLElement | null = null;
  private assemblyElement: HTMLElement | null = null;
  private notesElement: HTMLUListElement | null = null;

  public constructor(
    root: HTMLElement,
    options: SvgDatapathViewOptions = {},
  ) {
    this.root = root;
    this.ariaLabel =
      options.ariaLabel ?? DEFAULT_ARIA_LABEL;
    this.panelClassNames = splitClassNames(
      options.panelClassName ?? "",
    );
  }

  /** Renders the static layout. Calling mount again replaces the old scene. */
  public mount(
    layout: DatapathLayout<
      TComponentId,
      TWireId
    >,
  ): void {
    this.clearReferences();

    const panel = document.createElement("section");
    panel.classList.add("datapath-panel");

    if (this.panelClassNames.length > 0) {
      panel.classList.add(
        ...this.panelClassNames,
      );
    }

    const header = this.createHeader();
    const canvas = document.createElement("div");
    canvas.className = "datapath-canvas";

    this.scene = createSvgDatapathScene(
      layout,
      this.ariaLabel,
    );

    canvas.append(this.scene.svg);
    panel.append(header, canvas);
    this.root.replaceChildren(panel);

    this.reset();
  }

  /** Applies a single visualization phase to the mounted scene. */
  public renderFrame(
    frame: DatapathFrame<
      TPhase,
      TComponentId,
      TWireId
    >,
  ): void {
    const scene = this.requireScene();

    this.clearActiveState(scene);
    this.clearDisplayedValues(scene);

    for (
      const componentId of
      frame.activeComponentIds
    ) {
      const element =
        scene.componentElements.get(componentId);

      if (!element) {
        throw new Error(
          `Unknown datapath component id: ${componentId}`,
        );
      }

      element.classList.add("active");
      this.activeComponentIds.add(
        componentId,
      );
    }

    for (const wireId of frame.activeWireIds) {
      const element =
        scene.wireElements.get(wireId);

      if (!element) {
        throw new Error(
          `Unknown datapath wire id: ${wireId}`,
        );
      }

      element.classList.add("active");
      this.activeWireIds.add(wireId);
    }

    /*
    * SVG elements rendered later appear above earlier
    * sibling elements. Moving active wire groups to the
    * end of the wire layer makes them appear above
    * inactive wires.
    */
    this.bringActiveWiresToFront(
      scene,
      frame.activeWireIds,
    );

    this.renderValues(scene, frame.values);
    this.renderFrameSummary(frame);

    scene.svg.classList.add("has-cycle");
    scene.svg.dataset.phase = frame.phase;
    scene.svg.dataset.cycleNumber =
      String(frame.cycleNumber);
  }

  /** Clears dynamic state while preserving the static SVG layout. */
  public reset(): void {
    if (this.scene) {
      this.clearActiveState(this.scene);
      this.clearDisplayedValues(this.scene);

      this.scene.svg.classList.remove(
        "has-cycle",
      );

      delete this.scene.svg.dataset.phase;
      delete this.scene.svg.dataset.cycleNumber;

      this.scene.title.textContent =
        this.ariaLabel;

      this.scene.description.textContent =
        "No instruction phase is currently active.";
    }

    this.clearFrameSummary();
  }

  private createHeader(): HTMLElement {
    const header = document.createElement("header");
    header.className = "datapath-header";

    const summary = document.createElement("div");
    summary.className =
      "datapath-frame-summary";

    const phaseCode = document.createElement("p");
    phaseCode.className = "datapath-eyebrow";

    const phaseTitle = document.createElement("h3");
    phaseTitle.className =
      "datapath-phase-title";

    const phaseDescription =
      document.createElement("p");
    phaseDescription.className =
      "datapath-phase-description";

    const assembly = document.createElement("code");
    assembly.className = "datapath-assembly";

    summary.append(
      phaseCode,
      phaseTitle,
      phaseDescription,
      assembly,
    );

    const notes = document.createElement("ul");
    notes.className = "datapath-frame-notes";

    header.append(summary, notes);

    this.phaseCodeElement = phaseCode;
    this.phaseTitleElement = phaseTitle;
    this.phaseDescriptionElement =
      phaseDescription;
    this.assemblyElement = assembly;
    this.notesElement = notes;

    return header;
  }

  private renderValues(
    scene: SvgDatapathScene<
      TComponentId,
      TWireId
    >,
    values: Readonly<
      Partial<
        Record<
          TComponentId | TWireId,
          string
        >
      >
    >,
  ): void {
    for (
      const [componentId, element] of
      scene.componentValueElements
    ) {
      const value = values[componentId];

      if (value !== undefined) {
        renderWrappedSvgText(
          element,
          value,
          COMPONENT_VALUE_LINE_LENGTH,
          COMPONENT_VALUE_LINE_HEIGHT,
        );
      }
    }

    for (
      const [wireId, element] of
      scene.wireValueElements
    ) {
      const value = values[wireId];

      if (value !== undefined) {
        /*
         * A wire may already have a static layout label such
         * as "IorD". While a frame is active, replace that
         * visible label with the current control value, for
         * example "IorD = 0".
         *
         * The SVG scene stores the static label and dynamic
         * value as separate text elements, so the view hides
         * the static label and places the dynamic value at the
         * same coordinates. This avoids displaying both labels
         * simultaneously and does not require the layout to
         * know anything about runtime control values.
         */
        const wireGroup =
          scene.wireElements.get(wireId);

        const staticLabel =
          wireGroup?.querySelector<SVGTextElement>(
            ".wire-label:not(.wire-value)",
          ) ?? null;

        if (staticLabel) {
          staticLabel.setAttribute(
            "visibility",
            "hidden",
          );

          const labelX =
            staticLabel.getAttribute("x");

          const labelY =
            staticLabel.getAttribute("y");

          if (labelX !== null) {
            element.setAttribute("x", labelX);
          }

          if (labelY !== null) {
            element.setAttribute("y", labelY);
          }
        }

        element.textContent = value;
        element.setAttribute(
          "visibility",
          "visible",
        );
      }
    }
  }

  private renderFrameSummary(
    frame: DatapathFrame<
      TPhase,
      TComponentId,
      TWireId
    >,
  ): void {
    const summary = this.requireSummary();
    const scene = this.requireScene();

    summary.phaseCode.textContent =
      `Cycle ${frame.cycleNumber} · ${frame.phase}`;

    summary.phaseTitle.textContent =
      frame.phaseLabel;

    summary.phaseDescription.textContent =
      frame.description;

    summary.assembly.textContent =
      frame.assembly;
    summary.assembly.hidden = false;

    summary.notes.replaceChildren(
      ...frame.notes.map(note => {
        const item = document.createElement("li");
        item.textContent = note;
        return item;
      }),
    );

    summary.notes.hidden =
      frame.notes.length === 0;

    scene.title.textContent =
      `${frame.phase}: ${frame.phaseLabel} — ${frame.assembly}`;

    scene.description.textContent =
      frame.description;
  }

  private clearFrameSummary(): void {
    if (
      !this.phaseCodeElement ||
      !this.phaseTitleElement ||
      !this.phaseDescriptionElement ||
      !this.assemblyElement ||
      !this.notesElement
    ) {
      return;
    }

    this.phaseCodeElement.textContent =
      "Datapath ready";

    this.phaseTitleElement.textContent =
      "No visualization phase selected";

    this.phaseDescriptionElement.textContent =
      "Start an instruction to display its active datapath.";

    this.assemblyElement.textContent = "";
    this.assemblyElement.hidden = true;

    this.notesElement.replaceChildren();
    this.notesElement.hidden = true;
  }

  private clearActiveState(
    scene: SvgDatapathScene<
      TComponentId,
      TWireId
    >,
  ): void {
    for (
      const componentId of
      this.activeComponentIds
    ) {
      scene.componentElements
        .get(componentId)
        ?.classList.remove("active");
    }

    for (const wireId of this.activeWireIds) {
      scene.wireElements
        .get(wireId)
        ?.classList.remove("active");
    }

    this.activeComponentIds.clear();
    this.activeWireIds.clear();
  }

  private clearDisplayedValues(
    scene: SvgDatapathScene<
      TComponentId,
      TWireId
    >,
  ): void {
    for (
      const element of
      scene.componentValueElements.values()
    ) {
      element.replaceChildren();
      element.setAttribute(
        "visibility",
        "hidden",
      );
    }

    for (
      const [wireId, element] of
      scene.wireValueElements
    ) {
      element.textContent = "";
      element.setAttribute(
        "visibility",
        "hidden",
      );

      /*
       * Restore the layout's static wire label after the
       * previous frame's dynamic value has been removed.
       */
      const wireGroup =
        scene.wireElements.get(wireId);

      const staticLabel =
        wireGroup?.querySelector<SVGTextElement>(
          ".wire-label:not(.wire-value)",
        ) ?? null;

      staticLabel?.setAttribute(
        "visibility",
        "visible",
      );
    }
  }

  private clearReferences(): void {
    this.scene = null;
    this.activeComponentIds.clear();
    this.activeWireIds.clear();
    this.phaseCodeElement = null;
    this.phaseTitleElement = null;
    this.phaseDescriptionElement = null;
    this.assemblyElement = null;
    this.notesElement = null;
  }

  private requireScene():
    SvgDatapathScene<
      TComponentId,
      TWireId
    > {
    if (!this.scene) {
      throw new Error(
        "SvgDatapathView must be mounted before rendering a frame.",
      );
    }

    return this.scene;
  }

  private requireSummary(): {
    readonly phaseCode: HTMLElement;
    readonly phaseTitle: HTMLElement;
    readonly phaseDescription: HTMLElement;
    readonly assembly: HTMLElement;
    readonly notes: HTMLUListElement;
  } {
    if (
      !this.phaseCodeElement ||
      !this.phaseTitleElement ||
      !this.phaseDescriptionElement ||
      !this.assemblyElement ||
      !this.notesElement
    ) {
      throw new Error(
        "SvgDatapathView must be mounted before rendering a frame summary.",
      );
    }

    return {
      phaseCode: this.phaseCodeElement,
      phaseTitle: this.phaseTitleElement,
      phaseDescription:
        this.phaseDescriptionElement,
      assembly: this.assemblyElement,
      notes: this.notesElement,
    };
  }

  /*
    Makes the "effective order" of wires:
      inactive wires
      active wires
      components
  */
  private bringActiveWiresToFront(
    scene: SvgDatapathScene<
      TComponentId,
      TWireId
    >,
    activeWireIds: readonly TWireId[],
  ): void {
    for (const wireId of activeWireIds) {
      const wireElement =
        scene.wireElements.get(wireId);

      if (!wireElement) {
        throw new Error(
          `Unknown datapath wire id: ${wireId}`,
        );
      }

      /*
      * append() moves an existing element rather than
      * creating a duplicate.
      */
      wireElement.parentElement?.append(
        wireElement,
      );
    }
  }

}

function renderWrappedSvgText(
  element: SVGTextElement,
  value: string,
  maximumCharactersPerLine: number,
  lineHeight: number,
): void {
  const x = element.getAttribute("x") ?? "0";
  const lines = wrapText(
    value,
    maximumCharactersPerLine,
  );

  element.replaceChildren(
    ...lines.map((line, index) => {
      const span = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "tspan",
      );

      span.setAttribute("x", x);
      span.setAttribute(
        "dy",
        index === 0 ? "0" : String(lineHeight),
      );
      span.textContent = line;
      return span;
    }),
  );

  element.setAttribute("visibility", "visible");
}

function wrapText(
  value: string,
  maximumCharactersPerLine: number,
): readonly string[] {
  const words = value.trim().split(/\s+/u);

  if (words.length === 0 || words[0] === "") {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (
      candidate.length <=
        maximumCharactersPerLine ||
      currentLine.length === 0
    ) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function splitClassNames(
  classNames: string,
): readonly string[] {
  return classNames
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}