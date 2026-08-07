import {
  resolveWirePoints,
} from "./resolveWirePoints";

import type {
  DatapathComponentLayout,
  DatapathComponentShape,
  DatapathLayout,
  DatapathPoint,
  DatapathPortLayout,
  DatapathWireEndpoint,
  DatapathWireKind,
  DatapathWireLayout,
} from "./types";

const SVG_NAMESPACE =
  "http://www.w3.org/2000/svg";

const WIRE_VALUE_OFFSET_Y = 18;

let nextSceneIdentifier = 1;

export interface SvgDatapathScene<
  TComponentId extends string,
  TWireId extends string,
> {
  readonly svg: SVGSVGElement;
  readonly title: SVGTitleElement;
  readonly description: SVGDescElement;

  readonly componentElements:
    ReadonlyMap<TComponentId, SVGGElement>;

  readonly componentValueElements:
    ReadonlyMap<TComponentId, SVGTextElement>;

  readonly wireElements:
    ReadonlyMap<TWireId, SVGGElement>;

  readonly wireValueElements:
    ReadonlyMap<TWireId, SVGTextElement>;
}

/**
 * Renders the architecture-independent, static portion of a datapath SVG.
 */
export function createSvgDatapathScene<
  TComponentId extends string,
  TWireId extends string,
>(
  layout: DatapathLayout<
    TComponentId,
    TWireId
  >,
  ariaLabel: string,
): SvgDatapathScene<
  TComponentId,
  TWireId
> {
  validateLayout(layout);

  const sceneIdentifier =
    nextSceneIdentifier++;

  const componentElements =
    new Map<TComponentId, SVGGElement>();

  const componentValueElements =
    new Map<TComponentId, SVGTextElement>();

  const wireElements =
    new Map<TWireId, SVGGElement>();

  const wireValueElements =
    new Map<TWireId, SVGTextElement>();

  const componentLayouts =
    new Map<
      TComponentId,
      DatapathComponentLayout<TComponentId>
    >(
      layout.components.map(component => [
        component.id,
        component,
      ]),
    );

  const svg = createSvgElement("svg");
  const titleId =
    `datapath-title-${sceneIdentifier}`;
  const descriptionId =
    `datapath-description-${sceneIdentifier}`;

  svg.classList.add(
    "datapath",
    "datapath-svg",
  );

  svg.setAttribute(
    "viewBox",
    `0 0 ${layout.viewBox.width} ${layout.viewBox.height}`,
  );

  svg.setAttribute(
    "preserveAspectRatio",
    "xMidYMid meet",
  );

  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-labelledby",
    `${titleId} ${descriptionId}`,
  );

  const title = createSvgElement("title");
  title.id = titleId;
  title.textContent = ariaLabel;

  const description = createSvgElement("desc");
  description.id = descriptionId;
  description.textContent =
    "No instruction phase is currently active.";

  svg.append(
    title,
    description,
    createDefinitions(sceneIdentifier),
  );

  const wireLayer = createSvgElement("g");
  wireLayer.classList.add("wire-layer");

  for (const wire of layout.wires) {
    const renderedWire = createWire(
      wire,
      componentLayouts,
      sceneIdentifier,
    );

    wireElements.set(
      wire.id,
      renderedWire.group,
    );

    wireValueElements.set(
      wire.id,
      renderedWire.value,
    );

    wireLayer.append(renderedWire.group);
  }

  const componentLayer = createSvgElement("g");
  componentLayer.classList.add(
    "component-layer",
  );

  for (const component of layout.components) {
    const renderedComponent =
      createComponent(component);

    componentElements.set(
      component.id,
      renderedComponent.group,
    );

    componentValueElements.set(
      component.id,
      renderedComponent.value,
    );

    componentLayer.append(
      renderedComponent.group,
    );
  }

  svg.append(wireLayer, componentLayer);

  return {
    svg,
    title,
    description,
    componentElements,
    componentValueElements,
    wireElements,
    wireValueElements,
  };
}

interface RenderedWire {
  readonly group: SVGGElement;
  readonly value: SVGTextElement;
}

function createWire<
  TComponentId extends string,
  TWireId extends string,
>(
  wire:
    DatapathWireLayout<
      TComponentId,
      TWireId
    >,
  components:
    ReadonlyMap<
      TComponentId,
      DatapathComponentLayout<TComponentId>
    >,
  sceneIdentifier: number,
): RenderedWire {
  const points = resolveWirePoints(
    wire,
    components,
  );

  const group = createSvgElement("g");
  group.classList.add(
    "wire",
    wireKindClass(wire.kind),
    `wire-${toCssClassToken(wire.kind)}`,
  );

  group.setAttribute(
    "data-wire-id",
    wire.id,
  );

  const polyline = createSvgElement("polyline");
  polyline.setAttribute(
    "points",
    points
      .map(point => `${point.x},${point.y}`)
      .join(" "),
  );

  if (wire.kind !== "control") {
    polyline.setAttribute(
      "marker-end",
      `url(#datapath-arrow-${sceneIdentifier})`,
    );
  }

  group.append(polyline);

  const midpoint =
    pointAlongPolyline(points, 0.5);

  const labelBasePoint =
    wire.labelPosition ??
    pointAlongPolyline(
      points,
      wire.labelAt ?? 0.5,
    );

  const labelOffset =
    wire.labelOffset ?? { x: 0, y: -8 };

  if (wire.label) {
    group.append(
      createWireText(
        wire.label,
        labelBasePoint.x + labelOffset.x,
        labelBasePoint.y + labelOffset.y,
        "wire-label",
      ),
    );
  }

  const value = createWireText(
    "",
    midpoint.x,
    midpoint.y + WIRE_VALUE_OFFSET_Y,
    "wire-label",
    "wire-value",
  );

  value.setAttribute("visibility", "hidden");
  group.append(value);

  return { group, value };
}

interface RenderedComponent {
  readonly group: SVGGElement;
  readonly value: SVGTextElement;
}

function createComponent<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): RenderedComponent {
  const group = createSvgElement("g");
  group.classList.add(
    "component",
    `component-${toCssClassToken(component.shape)}`,
    toCssClassToken(component.id),
  );

  addCompatibilityClasses(
    group,
    component.shape,
  );

  group.setAttribute(
    "data-component-id",
    component.id,
  );

  group.append(createComponentShape(component));

  const centerX =
    component.x + component.width / 2;
  const centerY =
    component.y + component.height / 2;

  const defaultTitlePosition = {
    x: centerX,
    y:
      centerY +
      (component.subtitle ? -8 : 5),
  };

  const titlePosition =
    component.labelPosition ??
    defaultTitlePosition;

  const title = createSvgElement("text");
  title.classList.add("component-title");
  title.setAttribute(
    "x",
    String(titlePosition.x),
  );
  title.setAttribute(
    "y",
    String(titlePosition.y),
  );
  title.setAttribute("text-anchor", "middle");
  title.textContent = component.label;
  group.append(title);

  if (component.subtitle) {
    const subtitlePosition =
      component.subtitlePosition ?? {
        x: centerX,
        y: centerY + 15,
      };

    const subtitle = createSvgElement("text");
    subtitle.classList.add(
      "component-subtitle",
    );
    subtitle.setAttribute(
      "x",
      String(subtitlePosition.x),
    );
    subtitle.setAttribute(
      "y",
      String(subtitlePosition.y),
    );
    subtitle.setAttribute(
      "text-anchor",
      "middle",
    );
    subtitle.textContent = component.subtitle;
    group.append(subtitle);
  }

  for (const port of component.ports ?? []) {
    group.append(
      createComponentPortLabel(
        component,
        port,
      ),
    );
  }

  const valuePosition =
    component.valuePosition ?? {
      x: centerX,
      y: component.y + component.height + 20,
    };

  const value = createSvgElement("text");
  value.classList.add("component-value");
  value.setAttribute(
    "x",
    String(valuePosition.x),
  );
  value.setAttribute(
    "y",
    String(valuePosition.y),
  );
  value.setAttribute("text-anchor", "middle");
  value.setAttribute("visibility", "hidden");
  group.append(value);

  return { group, value };
}

function createComponentPortLabel<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
  port: DatapathPortLayout,
): SVGTextElement {
  const position =
    resolvePortLabelPosition(
      component,
      port,
    );

  const text = createSvgElement("text");
  text.classList.add(
    "component-port-label",
    `component-port-label--${port.side}`,
  );

  if (port.className) {
    text.classList.add(
      ...port.className
        .split(/\s+/u)
        .filter(Boolean),
    );
  }

  text.setAttribute(
    "data-port-id",
    port.id,
  );
  text.setAttribute("x", String(position.x));
  text.setAttribute("y", String(position.y));
  text.textContent = port.label;

  return text;
}

function resolvePortLabelPosition<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
  port: DatapathPortLayout,
): DatapathPoint {
  const inset = port.inset ?? 8;
  const offset =
    port.offset ?? { x: 0, y: 0 };

  let x: number;
  let y: number;

  switch (port.side) {
    case "left":
      x = component.x + inset;
      y =
        component.y +
        component.height * port.position;
      break;

    case "right":
      x =
        component.x +
        component.width -
        inset;
      y =
        component.y +
        component.height * port.position;
      break;

    case "top":
      x =
        component.x +
        component.width * port.position;
      y = component.y + inset;
      break;

    case "bottom":
      x =
        component.x +
        component.width * port.position;
      y =
        component.y +
        component.height -
        inset;
      break;
  }

  return {
    x: x + offset.x,
    y: y + offset.y,
  };
}

function createDefinitions(
  sceneIdentifier: number,
): SVGDefsElement {
  const definitions = createSvgElement("defs");
  const marker = createSvgElement("marker");

  marker.id =
    `datapath-arrow-${sceneIdentifier}`;
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "6");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute(
    "orient",
    "auto-start-reverse",
  );

  const arrow = createSvgElement("path");
  arrow.setAttribute(
    "d",
    "M 0 0 L 10 5 L 0 10 z",
  );
  arrow.setAttribute("fill", "context-stroke");

  marker.append(arrow);
  definitions.append(marker);

  return definitions;
}

function createWireText(
  content: string,
  x: number,
  y: number,
  ...classNames: readonly string[]
): SVGTextElement {
  const text = createSvgElement("text");
  text.classList.add(...classNames);
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y));
  text.setAttribute("text-anchor", "middle");
  text.textContent = content;
  return text;
}

function createComponentShape<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): SVGGraphicsElement {
  switch (component.shape) {
    case "block":
      return createBlockShape(component);

    case "ellipse":
      return createEllipseShape(component);

    case "mux":
      return createPathShape(
        createMuxPath(component),
      );

    case "alu":
    case "adder":
      return createPathShape(
        createAluAdderPath(component),
      );

    case "and-gate":
      return createPathShape(
        createAndGatePath(component),
      );

    case "or-gate":
      return createPathShape(
        createOrGatePath(component),
      );
  }
}

function createBlockShape<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): SVGRectElement {
  const rectangle = createSvgElement("rect");
  rectangle.classList.add("component-shape");
  rectangle.setAttribute("x", String(component.x));
  rectangle.setAttribute("y", String(component.y));
  rectangle.setAttribute(
    "width",
    String(component.width),
  );
  rectangle.setAttribute(
    "height",
    String(component.height),
  );
  rectangle.setAttribute("rx", "5");
  return rectangle;
}

function createEllipseShape<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): SVGEllipseElement {
  const ellipse = createSvgElement("ellipse");
  ellipse.classList.add("component-shape");
  ellipse.setAttribute(
    "cx",
    String(component.x + component.width / 2),
  );
  ellipse.setAttribute(
    "cy",
    String(component.y + component.height / 2),
  );
  ellipse.setAttribute(
    "rx",
    String(component.width / 2),
  );
  ellipse.setAttribute(
    "ry",
    String(component.height / 2),
  );
  return ellipse;
}

function createPathShape(
  pathData: string,
): SVGPathElement {
  const path = createSvgElement("path");
  path.classList.add("component-shape");
  path.setAttribute("d", pathData);
  return path;
}

function createMuxPath<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): string {
  const { x, y, width, height } = component;

  return [
    `M ${x} ${y}`,
    `Q ${x + width * 0.78} ${y}`,
    `${x + width} ${y + height / 2}`,
    `Q ${x + width * 0.78} ${y + height}`,
    `${x} ${y + height}`,
    "Z",
  ].join(" ");
}

function createAluAdderPath<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): string {
  const { x, y, width, height } = component;

  return [
    `M ${x} ${y}`,
    `L ${x + width} ${y + height * 0.25}`,
    `L ${x + width} ${y + height * 0.75}`,
    `L ${x} ${y + height}`,
    `L ${x} ${y + height * 0.6}`,
    `L ${x + width * 0.30} ${y + height * 0.50}`,
    `L ${x} ${y + height * 0.4}`,
    "Z",
  ].join(" ");
}

function createAndGatePath<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): string {
  const { y, height } = component;
  const bottom = y + height;
  const orientedX = createOrientedXResolver(
    component,
  );

  /*
   * A D-shaped AND gate. The normalized x-coordinates
   * are mirrored when orientation is "left".
   */
  return [
    `M ${orientedX(0)} ${y}`,
    `L ${orientedX(0.42)} ${y}`,
    `C ${orientedX(0.82)} ${y}`,
    `${orientedX(1)} ${y + height * 0.22}`,
    `${orientedX(1)} ${y + height / 2}`,
    `C ${orientedX(1)} ${y + height * 0.78}`,
    `${orientedX(0.82)} ${bottom}`,
    `${orientedX(0.42)} ${bottom}`,
    `L ${orientedX(0)} ${bottom}`,
    "Z",
  ].join(" ");
}

function createOrGatePath<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): string {
  const { y, height } = component;
  const bottom = y + height;
  const orientedX = createOrientedXResolver(
    component,
  );

  /*
   * Curved OR-gate body with a concave input edge and
   * a pointed output. The whole path can face left or
   * right without applying an SVG transform to labels.
   */
  return [
    `M ${orientedX(0)} ${y}`,
    `C ${orientedX(0.45)} ${y}`,
    `${orientedX(0.78)} ${y + height * 0.08}`,
    `${orientedX(1)} ${y + height / 2}`,
    `C ${orientedX(0.78)} ${y + height * 0.92}`,
    `${orientedX(0.45)} ${bottom}`,
    `${orientedX(0)} ${bottom}`,
    `C ${orientedX(0.18)} ${y + height * 0.75}`,
    `${orientedX(0.18)} ${y + height * 0.25}`,
    `${orientedX(0)} ${y}`,
    "Z",
  ].join(" ");
}

function createOrientedXResolver<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
): (normalizedX: number) => number {
  const orientation =
    component.orientation ?? "right";

  return normalizedX => {
    const directedX =
      orientation === "left"
        ? 1 - normalizedX
        : normalizedX;

    return (
      component.x +
      component.width * directedX
    );
  };
}

function addCompatibilityClasses(
  group: SVGGElement,
  shape: DatapathComponentShape,
): void {
  switch (shape) {
    case "mux":
      group.classList.add("mux");
      break;

    case "alu":
      group.classList.add("alu");
      break;

    case "adder":
      group.classList.add("datapath-adder");
      break;

    default:
      break;
  }
}

function wireKindClass(
  kind: DatapathWireKind,
): string {
  switch (kind) {
    case "control":
      return "control-bus";

    case "pc":
      return "pc-bus";

    case "branch":
      return "branch-bus";

    case "memory":
      return "memory-bus";

    case "data":
      return "data-bus";
  }
}

function pointAlongPolyline(
  points: readonly DatapathPoint[],
  ratio: number,
): DatapathPoint {
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (!previous || !current) {
      continue;
    }

    const length = Math.hypot(
      current.x - previous.x,
      current.y - previous.y,
    );

    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength === 0) {
    return points[0] ?? { x: 0, y: 0 };
  }

  const targetLength =
    totalLength * Math.min(1, Math.max(0, ratio));

  let traversedLength = 0;

  for (
    let index = 0;
    index < segmentLengths.length;
    index += 1
  ) {
    const segmentLength = segmentLengths[index];
    const start = points[index];
    const end = points[index + 1];

    if (
      segmentLength === undefined ||
      !start ||
      !end
    ) {
      continue;
    }

    if (
      traversedLength + segmentLength >=
      targetLength
    ) {
      const remaining =
        targetLength - traversedLength;

      const segmentRatio =
        segmentLength === 0
          ? 0
          : remaining / segmentLength;

      return {
        x:
          start.x +
          (end.x - start.x) * segmentRatio,
        y:
          start.y +
          (end.y - start.y) * segmentRatio,
      };
    }

    traversedLength += segmentLength;
  }

  return points[points.length - 1] ?? {
    x: 0,
    y: 0,
  };
}

function validateLayout<
  TComponentId extends string,
  TWireId extends string,
>(
  layout: DatapathLayout<
    TComponentId,
    TWireId
  >,
): void {
  if (
    !isPositiveFiniteNumber(layout.viewBox.width) ||
    !isPositiveFiniteNumber(layout.viewBox.height)
  ) {
    throw new Error(
      "Datapath viewBox dimensions must be positive finite numbers.",
    );
  }

  const componentIds = new Set<string>();

  for (const component of layout.components) {
    if (componentIds.has(component.id)) {
      throw new Error(
        `Duplicate datapath component id: ${component.id}`,
      );
    }

    componentIds.add(component.id);

    if (
      !Number.isFinite(component.x) ||
      !Number.isFinite(component.y) ||
      !isPositiveFiniteNumber(component.width) ||
      !isPositiveFiniteNumber(component.height)
    ) {
      throw new Error(
        `Invalid geometry for datapath component: ${component.id}`,
      );
    }

    const portIds = new Set<string>();

    for (const port of component.ports ?? []) {
      if (portIds.has(port.id)) {
        throw new Error(
          `Duplicate port id "${port.id}" in component: ${component.id}`,
        );
      }

      portIds.add(port.id);

      if (
        !Number.isFinite(port.position) ||
        port.position < 0 ||
        port.position > 1
      ) {
        throw new Error(
          `Port position must be between 0 and 1: ${component.id}.${port.id}`,
        );
      }

      if (
        port.inset !== undefined &&
        (!Number.isFinite(port.inset) ||
          port.inset < 0)
      ) {
        throw new Error(
          `Port inset must be a non-negative finite number: ${component.id}.${port.id}`,
        );
      }

      if (
        port.offset !== undefined &&
        (!Number.isFinite(port.offset.x) ||
          !Number.isFinite(port.offset.y))
      ) {
        throw new Error(
          `Invalid port offset: ${component.id}.${port.id}`,
        );
      }

      if (
        port.anchorOffset !== undefined &&
        (!Number.isFinite(port.anchorOffset.x) ||
          !Number.isFinite(port.anchorOffset.y))
      ) {
        throw new Error(
          `Invalid port anchor offset: ${component.id}.${port.id}`,
        );
      }
    }
  }

  const wireIds = new Set<string>();

  for (const wire of layout.wires) {
    if (wireIds.has(wire.id)) {
      throw new Error(
        `Duplicate datapath wire id: ${wire.id}`,
      );
    }

    wireIds.add(wire.id);

    if (
      wire.labelAt !== undefined &&
      (!Number.isFinite(wire.labelAt) ||
        wire.labelAt < 0 ||
        wire.labelAt > 1)
    ) {
      throw new Error(
        `Wire labelAt must be between 0 and 1: ${wire.id}`,
      );
    }

    if (
      wire.labelOffset !== undefined &&
      (!Number.isFinite(wire.labelOffset.x) ||
        !Number.isFinite(wire.labelOffset.y))
    ) {
      throw new Error(
        `Invalid wire label offset: ${wire.id}`,
      );
    }

    if (
      wire.labelPosition !== undefined &&
      (!Number.isFinite(wire.labelPosition.x) ||
        !Number.isFinite(wire.labelPosition.y))
    ) {
      throw new Error(
        `Invalid wire label position: ${wire.id}`,
      );
    }

    if ("points" in wire) {
      validateWirePoints(
        wire.id,
        wire.points,
        true,
      );
      continue;
    }

    validateWireEndpoint(
      wire.id,
      wire.from,
      layout.components,
    );

    validateWireEndpoint(
      wire.id,
      wire.to,
      layout.components,
    );

    validateWirePoints(
      wire.id,
      wire.route ?? [],
      false,
    );
  }
}

function validateWireEndpoint<
  TComponentId extends string,
>(
  wireId: string,
  endpoint:
    DatapathWireEndpoint<TComponentId>,
  components:
    readonly DatapathComponentLayout<TComponentId>[],
): void {
  if ("point" in endpoint) {
    validateWirePoints(
      wireId,
      [endpoint.point],
      false,
    );
    return;
  }

  const component = components.find(
    candidate =>
      candidate.id === endpoint.componentId,
  );

  if (!component) {
    throw new Error(
      `Unknown component "${endpoint.componentId}" ` +
      `used by wire "${wireId}".`,
    );
  }

  const hasPort = component.ports?.some(
    port => port.id === endpoint.portId,
  );

  if (!hasPort) {
    throw new Error(
      `Unknown port "${endpoint.portId}" on ` +
      `component "${endpoint.componentId}" ` +
      `used by wire "${wireId}".`,
    );
  }
}

function validateWirePoints(
  wireId: string,
  points: readonly DatapathPoint[],
  requireTwoPoints: boolean,
): void {
  if (requireTwoPoints && points.length < 2) {
    throw new Error(
      `Datapath wire requires at least two points: ${wireId}`,
    );
  }

  for (const point of points) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      throw new Error(
        `Invalid point in datapath wire: ${wireId}`,
      );
    }
  }
}

function isPositiveFiniteNumber(
  value: number,
): boolean {
  return Number.isFinite(value) && value > 0;
}

function createSvgElement<
  TTagName extends keyof SVGElementTagNameMap,
>(
  tagName: TTagName,
): SVGElementTagNameMap[TTagName] {
  return document.createElementNS(
    SVG_NAMESPACE,
    tagName,
  );
}

function toCssClassToken(
  value: string,
): string {
  return value.replace(
    /[^a-zA-Z0-9_-]/gu,
    "-",
  );
}
