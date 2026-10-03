export type GlobalFlags = {
  stripped: string[];
  plain: boolean;
  json: boolean;
};

export function parseGlobalFlags(args: string[]): GlobalFlags {
  const stripped: string[] = [];
  let plain = false;
  let json = false;

  for (const arg of args) {
    if (arg === "--plain") {
      plain = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    stripped.push(arg);
  }

  return { stripped, plain, json };
}

export function takeFlag(stripped: string[], name: string): {
  args: string[];
  present: boolean;
} {
  const out: string[] = [];
  let present = false;
  for (const arg of stripped) {
    if (arg === name) {
      present = true;
      continue;
    }
    out.push(arg);
  }
  return { args: out, present };
}
