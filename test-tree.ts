declare const require: any;
declare const process: any;

const fs = require("fs");
const path = require("path");

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function buildFileTree(
  dir: string,
  basePath: string,
  allowedFileExtensions: string[] = [".md"],
): FileNode | null {
  if (!fs.existsSync(dir)) return null;

  const stats = fs.statSync(dir);
  if (!stats.isDirectory()) return null;

  const name = path.basename(dir);

  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });
  const children = entries
    .filter((entry: any) => {
      if (entry.name.startsWith(".")) return false;
      if (entry.isDirectory()) return true;
      return (
        entry.isFile() &&
        allowedFileExtensions.some((ext) => entry.name.endsWith(ext))
      );
    })
    .map((entry: any) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return buildFileTree(fullPath, basePath, allowedFileExtensions)!;
      } else {
        return {
          name: entry.name,
          path: fullPath,
          type: "file",
        };
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "directory" ? -1 : 1;
    });

  return {
    name,
    path: dir,
    type: "directory",
    children,
  };
}

const srcDir = path.join(process.cwd(), "agelum-test/tests");
const tree = buildFileTree(srcDir, "", [".ts", ".tsx", ".md"]);
console.log(JSON.stringify(tree, null, 2));
