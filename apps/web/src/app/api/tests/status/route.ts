import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveProjectPath } from "@/lib/settings";

type TestsSetupState =
  | "missing"
  | "initializing"
  | "installing"
  | "ready"
  | "error";

interface TestsSetupStatus {
  state: TestsSetupState;
  startedAt?: string;
  updatedAt: string;
  pid?: number;
  log: string;
  error?: string;
}

const TESTS_SETUP_STATUS_FILE =
  ".agelum-tests-setup.json";

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({
      status: null,
    });
  }

  try {
    const repoPath =
      resolveProjectPath(repo);

    if (!repoPath) {
      return NextResponse.json({
        status: null,
      });
    }

    const testsDir = path.join(
      repoPath,
      ".agelum",
      "work",
      "tests",
    );

    const statusPath = path.join(
      testsDir,
      TESTS_SETUP_STATUS_FILE,
    );
    if (!fs.existsSync(statusPath)) {
      return NextResponse.json({
        status: null,
      });
    }

    const raw = fs.readFileSync(
      statusPath,
      "utf8",
    );
    const status = JSON.parse(
      raw,
    ) as TestsSetupStatus;
    return NextResponse.json({
      status,
    });
  } catch (error) {
    return NextResponse.json(
      { status: null },
      { status: 500 },
    );
  }
}
