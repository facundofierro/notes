import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const filePath =
    searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({
      content: "",
    });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        content: "",
      });
    }

    const content = fs.readFileSync(
      filePath,
      "utf-8",
    );
    return NextResponse.json({
      content,
    });
  } catch (error) {
    return NextResponse.json(
      { content: "" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    const {
      path: filePath,
      content,
      action,
      newPath,
    } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 },
      );
    }

    if (
      action === "rename" &&
      newPath
    ) {
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          {
            error: `Source path does not exist: ${filePath}`,
          },
          { status: 404 },
        );
      }
      if (fs.existsSync(newPath)) {
        return NextResponse.json(
          {
            error: `Target path already exists: ${newPath}`,
          },
          { status: 400 },
        );
      }
      const dir = path.dirname(newPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
          recursive: true,
        });
      }
      fs.renameSync(filePath, newPath);
      return NextResponse.json({
        success: true,
        path: newPath,
      });
    }

    if (action === "mkdir") {
      if (fs.existsSync(filePath)) {
        const stats =
          fs.statSync(filePath);
        if (stats.isDirectory()) {
          return NextResponse.json({
            success: true,
            path: filePath,
            message:
              "Directory already exists",
          });
        }
        return NextResponse.json(
          {
            error: `A file already exists at this path: ${filePath}`,
          },
          { status: 400 },
        );
      }
      fs.mkdirSync(filePath, {
        recursive: true,
      });
      return NextResponse.json({
        success: true,
        path: filePath,
      });
    }

    const dir = path.dirname(filePath);
    if (fs.existsSync(dir)) {
      const stats = fs.statSync(dir);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          {
            error: `Parent path exists but is not a directory: ${dir}`,
          },
          { status: 400 },
        );
      }
    } else {
      fs.mkdirSync(dir, {
        recursive: true,
      });
    }

    if (
      fs.existsSync(filePath) &&
      fs
        .statSync(filePath)
        .isDirectory()
    ) {
      return NextResponse.json(
        {
          error: `Cannot write file: a directory already exists at this path: ${filePath}`,
        },
        { status: 400 },
      );
    }

    fs.writeFileSync(
      filePath,
      content || "",
    );
    return NextResponse.json({
      success: true,
      path: filePath,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/file:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Failed to process request",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const { searchParams } = new URL(
      request.url,
    );
    const filePath =
      searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 },
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          error: `Path does not exist: ${filePath}`,
        },
        { status: 404 },
      );
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      fs.rmSync(filePath, {
        recursive: true,
        force: true,
      });
    } else {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 },
    );
  }
}
