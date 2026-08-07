export type DatapathWireKind =
  | "data"
  | "control"
  | "pc"
  | "branch"
  | "memory";

export type DatapathComponentShape =
  | "block"
  | "ellipse"
  | "mux"
  | "alu"
  | "adder"
  | "and-gate"
  | "or-gate";

export interface DatapathPoint {
  readonly x: number;
  readonly y: number;
}

export type DatapathPortSide =
  | "left"
  | "right"
  | "top"
  | "bottom";

/**
 * Describes one visible input, output, or control port on a component.
 *
 * A port serves two purposes:
 * 1. It places a label inside the component.
 * 2. It provides a stable wire endpoint on the component boundary.
 */
export interface DatapathPortLayout {
  /** Unique within the containing component. */
  readonly id: string;

  /** Text shown inside the component beside the port. */
  readonly label: string;

  /** Edge associated with the port. */
  readonly side: DatapathPortSide;

  /**
   * Position along the selected edge from 0 to 1.
   *
   * left/right: 0 = top, 1 = bottom
   * top/bottom: 0 = left, 1 = right
   */
  readonly position: number;

  /** Distance from the edge toward the component interior for the label. */
  readonly inset?: number;

  /** Fine adjustment applied only to the visible label. */
  readonly offset?: DatapathPoint;

  /** Optional CSS class for component-specific label sizing. */
  readonly className?: string;

  /**
   * Fine adjustment applied only to the resolved wire endpoint.
   *
   * Most ports should omit this. It is useful when a polygonal component's
   * logical connection point is slightly inside its rectangular bounds.
   */
  readonly anchorOffset?: DatapathPoint;
}

export type DatapathComponentOrientation =
  | "left"
  | "right";

export interface DatapathComponentLayout<
  TComponentId extends string,
> {
  readonly id: TComponentId;
  readonly label: string;
  readonly subtitle?: string;
  readonly shape: DatapathComponentShape;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  /**
   * Horizontal direction for asymmetric component shapes.
   *
   * Logic gates default to "right". Set this to "left" when the gate
   * output should face toward decreasing x-coordinates.
   */
  readonly orientation?: DatapathComponentOrientation;

  /** Optional exact positions for the component's own text. */
  readonly labelPosition?: DatapathPoint;
  readonly subtitlePosition?: DatapathPoint;
  readonly valuePosition?: DatapathPoint;

  /** Input, output, and control labels drawn inside the component. */
  readonly ports?: readonly DatapathPortLayout[];
}

/** References a named port belonging to a component. */
export interface DatapathPortReference<
  TComponentId extends string,
> {
  readonly componentId: TComponentId;
  readonly portId: string;
}

/**
 * Represents a fixed non-component endpoint.
 *
 * This is intentionally limited to sources such as constants and explicit
 * merge/junction positions. Component endpoints should use port references.
 */
export interface DatapathPointReference {
  readonly point: DatapathPoint;
}

export type DatapathWireEndpoint<
  TComponentId extends string,
> =
  | DatapathPortReference<TComponentId>
  | DatapathPointReference;

interface DatapathWirePresentation {
  readonly label?: string;

  /** Position along the complete resolved polyline: 0 = start, 1 = end. */
  readonly labelAt?: number;

  /** Fine adjustment from the computed label location. */
  readonly labelOffset?: DatapathPoint;

  /** Exact label position; takes precedence over labelAt. */
  readonly labelPosition?: DatapathPoint;
}

/**
 * Legacy absolute wire representation.
 *
 * Keep this during migration so layouts can be converted incrementally.
 */
export interface AbsoluteDatapathWireLayout<
  TWireId extends string,
> extends DatapathWirePresentation {
  readonly id: TWireId;
  readonly kind: DatapathWireKind;

  /** Includes both endpoints and every intermediate bend. */
  readonly points: readonly DatapathPoint[];
}

/**
 * Preferred wire representation.
 *
 * Component endpoints are tied to named ports. Only intermediate bends are
 * stored in `route`, so moving a component automatically moves its wire ends.
 */
export interface AnchoredDatapathWireLayout<
  TComponentId extends string,
  TWireId extends string,
> extends DatapathWirePresentation {
  readonly id: TWireId;
  readonly kind: DatapathWireKind;

  readonly from:
    DatapathWireEndpoint<TComponentId>;

  readonly to:
    DatapathWireEndpoint<TComponentId>;

  /** Intermediate routing points only. */
  readonly route?: readonly DatapathPoint[];
}

export type DatapathWireLayout<
  TComponentId extends string,
  TWireId extends string,
> =
  | AbsoluteDatapathWireLayout<TWireId>
  | AnchoredDatapathWireLayout<
      TComponentId,
      TWireId
    >;

export interface DatapathLayout<
  TComponentId extends string,
  TWireId extends string,
> {
  readonly viewBox: {
    readonly width: number;
    readonly height: number;
  };

  readonly components:
    readonly DatapathComponentLayout<TComponentId>[];

  readonly wires:
    readonly DatapathWireLayout<
      TComponentId,
      TWireId
    >[];
}

export type DatapathValueMap<
  TComponentId extends string,
  TWireId extends string,
> = Readonly<
  Partial<
    Record<TComponentId | TWireId, string>
  >
>;

export interface DatapathFrame<
  TPhase extends string,
  TComponentId extends string,
  TWireId extends string,
> {
  readonly phase: TPhase;
  readonly phaseLabel: string;
  readonly cycleNumber: number;
  readonly assembly: string;
  readonly description: string;

  readonly activeComponentIds:
    readonly TComponentId[];

  readonly activeWireIds:
    readonly TWireId[];

  readonly values:
    DatapathValueMap<TComponentId, TWireId>;

  readonly notes: readonly string[];
}

export interface DatapathView<
  TPhase extends string,
  TComponentId extends string,
  TWireId extends string,
> {
  mount(
    layout: DatapathLayout<
      TComponentId,
      TWireId
    >,
  ): void;

  renderFrame(
    frame: DatapathFrame<
      TPhase,
      TComponentId,
      TWireId
    >,
  ): void;

  reset(): void;
}

export interface SimulationController {
  initialize(): void;
  step(): void;
  reset(): void;
  dispose(): void;
}
