export interface NormalizedTicketContext {
  title: string;
  description: string;
  comments: string[];
}

/**
 * Sanitizes and truncates ticket fields before passing them to an AI provider.
 * Caps lengths to avoid unexpectedly large prompts while preserving enough
 * context for accurate analysis.
 */
export function normalizeTicketContext(
  title: string,
  description: string,
  comments: string[] = [],
): NormalizedTicketContext {
  return {
    title: title.trim().slice(0, 200),
    description: description.trim().slice(0, 4000),
    comments: comments
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((c) => c.slice(0, 500)),
  };
}
