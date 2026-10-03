import { AxiError, exitCodeForError, runAxiCli } from "axi-sdk-js";
import { resolveJournalContext, type JournalContext } from "./context.js";
import {
  TOP_HELP,
  COMMAND_HELP,
  DESCRIPTION,
  homeCommand,
  newCommand,
  addCommand,
  listCommand,
  showCommand,
  pathCommand,
  rootCommand,
  doctorCommand,
  ensureGitignoreCommand,
} from "./commands.js";
import { VERSION } from "./version.js";

export async function main(argv?: string[]): Promise<void> {
  const rawArgv = argv ?? process.argv.slice(2);
  const dashboardFlags =
    rawArgv.length > 0 &&
    rawArgv.every((arg) => arg === "--plain" || arg === "--json");
  const normalizedArgv = dashboardFlags
    ? ["dashboard", ...rawArgv]
    : rawArgv;
  const jsonErrors = normalizedArgv.includes("--json");

  await runAxiCli<JournalContext>({
    argv: normalizedArgv,
    description: DESCRIPTION,
    version: VERSION,
    packageName: "repo-journal-axi",
    topLevelHelp: TOP_HELP,
    home: homeCommand,
    resolveContext: async () => resolveJournalContext(),
    getCommandHelp: (command) => COMMAND_HELP[command] ?? null,
    ...(jsonErrors
      ? {
          renderUnknownCommand: (command: string) =>
            `${JSON.stringify({
              error: {
                code: "VALIDATION_ERROR",
                message: `Unknown command: ${command}`,
                suggestions: ["Run `--help` to see available commands"],
              },
            })}\n`,
          formatError: (error: unknown) => {
            const known = error instanceof AxiError;
            return {
              output: `${JSON.stringify({
                error: {
                  code: known ? error.code : "UNKNOWN",
                  message:
                    error instanceof Error ? error.message : String(error),
                  suggestions: known ? error.suggestions : [],
                },
              })}\n`,
              exitCode: exitCodeForError(error),
            };
          },
        }
      : {}),
    commands: {
      dashboard: homeCommand,
      new: newCommand,
      add: addCommand,
      list: listCommand,
      show: showCommand,
      path: pathCommand,
      root: rootCommand,
      doctor: doctorCommand,
      "ensure-gitignore": ensureGitignoreCommand,
    },
  });
}
