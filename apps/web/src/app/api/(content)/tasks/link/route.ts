import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface LinkRequest {
  taskPath: string;
  planPath?: string;
  testsPath?: string;
}

/**
 * API endpoint to programmatically update task file frontmatter with links to plan/tests
 * This ensures deterministic, reliable linking without depending on LLM behavior
 */
export async function POST(request: Request) {
  try {
    const body: LinkRequest = await request.json();
    const { taskPath, planPath, testsPath } = body;

    if (!taskPath) {
      return NextResponse.json(
        { error: "taskPath is required" },
        { status: 400 }
      );
    }

    if (!planPath && !testsPath) {
      return NextResponse.json(
        { error: "At least one of planPath or testsPath is required" },
        { status: 400 }
      );
    }

    // Read the task file
    if (!fs.existsSync(taskPath)) {
      return NextResponse.json(
        { error: `Task file not found: ${taskPath}` },
        { status: 404 }
      );
    }

    let content = fs.readFileSync(taskPath, "utf-8");

    // Check if frontmatter exists
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

    if (frontmatterMatch) {
      // Frontmatter exists, update it
      let frontmatterContent = frontmatterMatch[1];
      const lines = frontmatterContent.split('\n');
      
      // Update or add plan field
      if (planPath !== undefined) {
        const planLineIndex = lines.findIndex(l => l.trim().startsWith('plan:'));
        const planLine = `plan: ${planPath}`;
        
        if (planLineIndex !== -1) {
          lines[planLineIndex] = planLine;
        } else {
          lines.push(planLine);
        }
      }
      
      // Update or add tests field
      if (testsPath !== undefined) {
        const testsLineIndex = lines.findIndex(l => l.trim().startsWith('tests:'));
        const testsLine = `tests: ${testsPath}`;
        
        if (testsLineIndex !== -1) {
          lines[testsLineIndex] = testsLine;
        } else {
          lines.push(testsLine);
        }
      }
      
      const newFrontmatter = lines.join('\n');
      content = content.replace(frontmatterMatch[0], `---\n${newFrontmatter}\n---\n`);
    } else {
      // No frontmatter, create it
      const frontmatterFields: string[] = [];
      if (planPath) frontmatterFields.push(`plan: ${planPath}`);
      if (testsPath) frontmatterFields.push(`tests: ${testsPath}`);
      
      const newFrontmatter = `---\n${frontmatterFields.join('\n')}\n---\n`;
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
      },
    });
  } catch (error) {
    console.error("Error updating task file:", error);
    return NextResponse.json(
      {
        error: "Failed to update task file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
