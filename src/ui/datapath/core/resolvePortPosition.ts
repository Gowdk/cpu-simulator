import type {
  DatapathComponentLayout,
  DatapathPoint,
  DatapathPortLayout,
} from "./types";

/**
 * Resolves a component port to an SVG coordinate.
 *
 * Unlike the port-label renderer, this function places the anchor on the
 * component boundary. Label inset/offset values do not affect wire geometry.
 */
export function resolvePortPosition<
  TComponentId extends string,
>(
  component:
    DatapathComponentLayout<TComponentId>,
  port: DatapathPortLayout,
): DatapathPoint {
  const anchorOffset =
    port.anchorOffset ?? { x: 0, y: 0 };

  let x: number;
  let y: number;

  switch (port.side) {
    case "left":
      x = component.x;
      y =
        component.y +
        component.height * port.position;
      break;

    case "right":
      x =
        component.x +
        component.width;
      y =
        component.y +
        component.height * port.position;
      break;

    case "top":
      x =
        component.x +
        component.width * port.position;
      y = component.y;
      break;

    case "bottom":
      x =
        component.x +
        component.width * port.position;
      y =
        component.y +
        component.height;
      break;
  }

  return {
    x: x + anchorOffset.x,
    y: y + anchorOffset.y,
  };
}
