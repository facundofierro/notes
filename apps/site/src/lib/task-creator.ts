import fs from "fs";
import path from "path";
import os from "os";
import matter from "gray-matter";

export interface CreateTaskOptions {
  repo: string;
  title: string;
  description: string;
  screenshotDataUrl: string;
  state: string;
  sourceUrl: string;
}

const AGELUM_DIR = path.join(os.homedir(), ".agelum");

export async function createTask(opts: CreateTaskOptions) {
  // For simplicity in this prototype, we'll assume the project is the current working directory
  // In a real scenario, we would resolve this from a global projects list
  const projectRoot = process.cwd(); 
  const tasksDir = path.join(projectRoot, ".agelum", "work", "tasks", opts.state);
  const imagesDir = path.join(projectRoot, ".agelum", "work", "tasks", "images");

  if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTitle = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fileName = `${timestamp}-${safeTitle}`;

  // Save image
  const base64Data = opts.screenshotDataUrl.replace(/^data:image\/png;base64,/, "");
  const imagePath = path.join(imagesDir, `${fileName}.png`);
  fs.writeFileSync(imagePath, base64Data, "base64");

  // Create markdown
  const content = `
${opts.description}

## Context
- **Source URL**: ${opts.sourceUrl}
- **Tool**: Chrome Plugin

![Screenshot](./images/${fileName}.png)
`;

  const taskData = {
    created: new Date().toISOString(),
    state: opts.state,
    source: "chrome-plugin",
    title: opts.title,
  };

  const fileContent = matter.stringify(content, taskData);
  const taskPath = path.join(tasksDir, `${fileName}.md`);
  fs.writeFileSync(taskPath, fileContent);

  return { success: true, path: taskPath, id: fileName };
}
