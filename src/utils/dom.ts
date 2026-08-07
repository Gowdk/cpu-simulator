/**
 * Finds a required DOM element and narrows it to the requested element type.
 *
 * Throws immediately when the selector does not match an element.
 */
export function requireElement<T extends Element>(
  selector: string,
  parent: ParentNode = document,
): T {
  const element = parent.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Could not find required element: ${selector}`);
  }

  return element;
}

/**
 * Finds an optional DOM element.
 */
export function findElement<T extends Element>(
  selector: string,
  parent: ParentNode = document,
): T | null {
  return parent.querySelector<T>(selector);
}