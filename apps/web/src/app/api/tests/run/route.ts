import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    const { path: testPath } = body;

    if (!testPath) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 },
      );
    }

    if (!fs.existsSync(testPath)) {
      return NextResponse.json(
        {
          error: "File does not exist",
        },
        { status: 404 },
      );
    }

    let projectRoot = testPath;
    if (
      fs.statSync(testPath).isFile()
    ) {
      projectRoot =
        path.dirname(testPath);
    }
    // Walk up until we find package.json
    while (
      projectRoot !== "/" &&
      !fs.existsSync(
        path.join(
          projectRoot,
          "package.json",
        ),
      )
    ) {
      projectRoot = path.dirname(
        projectRoot,
      );
    }

    if (projectRoot === "/") {
      // Fallback: assume parent of parent if src is used
      projectRoot = path.dirname(
        path.dirname(testPath),
      );
    }

    let filesToRun: string[] = [];
    if (
      fs
        .statSync(testPath)
        .isDirectory()
    ) {
      const findTsFiles = (
        dir: string,
      ) => {
        const files = fs.readdirSync(
          dir,
          { withFileTypes: true },
        );
        for (const file of files) {
          const fullPath = path.join(
            dir,
            file.name,
          );
          if (file.isDirectory()) {
            findTsFiles(fullPath);
          } else if (
            file.isFile() &&
            file.name.endsWith(".ts")
          ) {
            filesToRun.push(fullPath);
          }
        }
      };
      findTsFiles(testPath);
    } else {
      filesToRun = [testPath];
    }

    if (filesToRun.length === 0) {
      return NextResponse.json(
        {
          error: "No test files found",
        },
        { status: 404 },
      );
    }

    // Find local tsx
    let tsxPath = 'npx tsx'; // Default fallback
    const localTsx = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
    if (fs.existsSync(localTsx)) {
      tsxPath = localTsx;
    }

    console.log(`Running tests in ${projectRoot}:`, filesToRun);

    // Create a readable stream for the output
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const file of filesToRun) {
          controller.enqueue(encoder.encode(`\n\n--- Running ${path.basename(file)} ---\n`));
          
          await new Promise<void>((resolve) => {
            const command = tsxPath === localTsx ? localTsx : 'npx';
            const args = tsxPath === localTsx ? [file] : ['tsx', file];

            const child = spawn(command, args, {
              cwd: projectRoot,
              env: { ...process.env, PATH: process.env.PATH },
              shell: true
            });

              child.stdout.on(
                "data",
                (data) => {
                  controller.enqueue(
                    encoder.encode(
                      data.toString(),
                    ),
                  );
                },
              );

              child.stderr.on(
                "data",
                (data) => {
                  controller.enqueue(
                    encoder.encode(
                      data.toString(),
                    ),
                  );
                },
              );

              child.on(
                "close",
                (code) => {
                  controller.enqueue(
                    encoder.encode(
                      `\nTest ${path.basename(file)} exited with code ${code}`,
                    ),
                  );
                  resolve();
                },
              );

              child.on(
                "error",
                (err) => {
                  controller.enqueue(
                    encoder.encode(
                      `\nFailed to start test process: ${err.message}`,
                    ),
                  );
                  resolve();
                },
              );
            },
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to run test" },
      { status: 500 },
    );
  }
}
