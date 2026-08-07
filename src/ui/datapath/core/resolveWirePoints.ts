import {
  resolvePortPosition,
} from "./resolvePortPosition";

import type {
  AnchoredDatapathWireLayout,
  DatapathComponentLayout,
  DatapathPoint,
  DatapathWireEndpoint,
  DatapathWireLayout,
} from "./types";

/** Converts either supported wire definition into the polyline SVG expects. */
export function resolveWirePoints<
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
): readonly DatapathPoint[] {
  if ("points" in wire) {
    return wire.points;
  }

  const points = [
    resolveWireEndpoint(
      wire.id,
      wire.from,
      components,
    ),
    ...(wire.route ?? []),
    resolveWireEndpoint(
      wire.id,
      wire.to,
      components,
    ),
  ];

  return removeConsecutiveDuplicatePoints(
    points,
  );
}

function resolveWireEndpoint<
  TComponentId extends string,
  TWireId extends string,
>(
  wireId: TWireId,
  endpoint:
    DatapathWireEndpoint<TComponentId>,
  components:
    ReadonlyMap<
      TComponentId,
      DatapathComponentLayout<TComponentId>
    >,
): DatapathPoint {
  if ("point" in endpoint) {
    return endpoint.point;
  }

  const component =
    components.get(endpoint.componentId);

  if (!component) {
    throw new Error(
      `Unknown component "${endpoint.componentId}" ` +
      `used by wire "${wireId}".`,
    );
  }

  const port =
    component.ports?.find(
      candidate =>
        candidate.id === endpoint.portId,
    );

  if (!port) {
    throw new Error(
      `Unknown port "${endpoint.portId}" on ` +
      `component "${endpoint.componentId}" ` +
      `used by wire "${wireId}".`,
    );
  }

  return resolvePortPosition(
    component,
    port,
  );
}

function removeConsecutiveDuplicatePoints(
  points: readonly DatapathPoint[],
): readonly DatapathPoint[] {
  const resolved: DatapathPoint[] = [];

  for (const point of points) {
    const previous =
      resolved[resolved.length - 1];

    if (
      previous &&
      previous.x === point.x &&
      previous.y === point.y
    ) {
      continue;
    }

    resolved.push(point);
  }

  return resolved;
}

/** Narrows an anchored wire without exposing representation checks elsewhere. */
export function isAnchoredWire<
  TComponentId extends string,
  TWireId extends string,
>(
  wire:
    DatapathWireLayout<
      TComponentId,
      TWireId
    >,
): wire is AnchoredDatapathWireLayout<
  TComponentId,
  TWireId
> {
  return "from" in wire;
}
