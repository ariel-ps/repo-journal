import { homedir } from "node:os";

export type Renderable = string | Record<string, unknown>;

function collapseHomeDirectory(path: string): string {
  const home = homedir();
  if (!path.startsWith(home)) return path;
  return `~${path.slice(home.length)}`;
}

export function homeHeader(description: string): Record<string, unknown> {
  return {
    bin: collapseHomeDirectory(process.argv[1] ?? ""),
    description,
  };
}

export function withHelp(
  body: Record<string, unknown>,
  help: string[],
): Record<string, unknown> {
  if (help.length === 0) return body;
  return { ...body, help };
}
