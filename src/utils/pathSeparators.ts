// Cross-platform path separator helpers.
//
// Vault and note paths flow through Tauri/IPC and may arrive in either
// `forward/slash` (macOS/Linux) or `back\slash` (Windows) form depending on
// where they originated. The Rust side normalizes most paths to forward
// slashes at the Tauri boundary (see vault::normalize_vault_path), but a few
// callers still pass through unnormalized OS paths. These helpers accept
// either separator so frontend logic stays platform-agnostic.

const SEPARATOR_PATTERN = /[/\\]/

/**
 * Split a path into segments by either `/` or `\`. Empty segments are kept
 * (matching `String.split` semantics) so callers can preserve leading slashes.
 */
export function splitPath(path: string): string[] {
  return path.split(SEPARATOR_PATTERN)
}

/**
 * Return the last non-empty segment of a path (the basename), accepting
 * either separator. Returns the original path if it has no separators.
 */
export function getBasename(path: string): string {
  const segments = path.split(SEPARATOR_PATTERN).filter((segment) => segment.length > 0)
  return segments.length > 0 ? segments[segments.length - 1] : path
}

/**
 * Return the basename without its trailing `.md` extension. Useful for
 * deriving display titles or comparing slugs.
 */
export function getStem(path: string): string {
  return getBasename(path).replace(/\.md$/, '')
}
