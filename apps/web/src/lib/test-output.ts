export type TestExecutionStatus = "running" | "success" | "failure";

const EXIT_CODE_REGEX = /Test\s+.+?\s+exited with code\s+(-?\d+)/g;

const ERROR_LIKE_REGEX =
  /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|AggregateError):|\bUnhandledPromiseRejection\b|\bERR_[A-Z0-9_]+\b/;

const STDERR_ERRORS_DETECTED_REGEX = /errors detected in (?:stdout|stderr)/i;

export function inferTestExecutionStatus(
  output: string | undefined,
  isRunning: boolean | undefined,
): TestExecutionStatus {
  if (isRunning) return "running";
  if (!output) return "failure";

  EXIT_CODE_REGEX.lastIndex = 0;
  const exitCodes: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = EXIT_CODE_REGEX.exec(output))) {
    const parsed = Number(match[1]);
    if (!Number.isNaN(parsed)) {
      exitCodes.push(parsed);
    }
  }

  const hasNonZeroExit = exitCodes.some((c) => c !== 0);
  const hasZeroExit = exitCodes.some((c) => c === 0);

  const hasRuntimeErrorLike =
    ERROR_LIKE_REGEX.test(output) || STDERR_ERRORS_DETECTED_REGEX.test(output);

  if (hasNonZeroExit) return "failure";
  if (hasZeroExit && hasRuntimeErrorLike) return "failure";
  if (hasZeroExit) return "success";

  return "failure";
}

export function formatTestOutputForPrompt(
  output: string,
  opts?: { maxChars?: number },
): string {
  const maxChars = Math.max(1000, opts?.maxChars ?? 20000);
  if (output.length <= maxChars) {
    return output;
  }
  const tail = output.slice(-maxChars);
  return [`[Output truncated to last ${maxChars} chars]`, tail].join("\n");
}
