const HTML_CHARACTER_MAP: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

/**
 * Escapes user-provided text before inserting it into an HTML template string.
 */
export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    character => HTML_CHARACTER_MAP[character] ?? character,
  );
}