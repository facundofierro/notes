import { NextResponse } from "next/server";
import fs from "fs";

interface LinkRequest {
  taskPath: string;
  planPath?: string;
  testsPath?: string;
  summaryPath?: string;
}

/**
 * API endpoint to programmatically update task file frontmatter with links to plan/tests/summary
 * This ensures deterministic, reliable linking without depending on LLM behavior
 */
export async function POST(request: Request) {
  try {
    const body: LinkRequest = await request.json();
    const { taskPath, planPath, testsPath, summaryPath } = body;

    if (!taskPath) {
      return NextResponse.json(
        { error: "taskPath is required" },
        { status: 400 },
      );
    }

    if (!planPath && !testsPath && !summaryPath) {
      return NextResponse.json(
        {
          error:
            "At least one of planPath, testsPath, or summaryPath is required",
        },
        { status: 400 },
      );
    }

    // Read the task file
    if (!fs.existsSync(taskPath)) {
      return NextResponse.json(
        { error: `Task file not found: ${taskPath}` },
        { status: 404 },
      );
    }

    let content = fs.readFileSync(taskPath, "utf-8");

    // Check if frontmatter exists - robust regex for different line endings
    const frontmatterMatch = content.match(
      /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/,
    );

    if (frontmatterMatch) {
      // Frontmatter exists, update it
      const frontmatterContent = frontmatterMatch[1];
      const lines = frontmatterContent.split(/\r?\n/);
      // We'll rebuild lines to ensure we don't duplicate

      const updateOrAdd = (key: string, value: string) => {
        const index = lines.findIndex((l) => l.trim().startsWith(`${key}:`));
        const newLine = `${key}: ${value}`;
        if (index !== -1) {
          lines[index] = newLine;
        } else {
          lines.push(newLine);
        }
      };

      if (planPath !== undefined) updateOrAdd("plan", planPath);
      if (testsPath !== undefined) updateOrAdd("tests", testsPath);
      if (summaryPath !== undefined) updateOrAdd("summary", summaryPath);

      const newFrontmatterContent = lines.join("\n"); // Standardize to \n internally
      const newFrontmatterBlock = `---\n${newFrontmatterContent}\n---${frontmatterMatch[2]}`;
      content = content.replace(frontmatterMatch[0], newFrontmatterBlock);
    } else {
      // No frontmatter, create it
      const frontmatterFields: string[] = [];
      if (planPath) frontmatterFields.push(`plan: ${planPath}`);
      if (testsPath) frontmatterFields.push(`tests: ${testsPath}`);
      if (summaryPath) frontmatterFields.push(`summary: ${summaryPath}`);

      const newFrontmatter = `---\n${frontmatterFields.join("\n")}\n---\n`;
      content = newFrontmatter + content;
    }

    // Write the updated content back
    fs.writeFileSync(taskPath, content, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Task file updated successfully",
      updatedFields: {
        ...(planPath !== undefined && { plan: planPath }),
        ...(testsPath !== undefined && { tests: testsPath }),
        ...(summaryPath !== undefined && { summary: summaryPath }),
      },
    });
  } catch (error) {
    console.error("Error updating task file:", error);
    return NextResponse.json(
      {
        error: "Failed to update task file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
