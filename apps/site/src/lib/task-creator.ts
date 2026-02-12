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
  // Resolve project path from settings
  let projectRoot = process.cwd();
  const settingsFile = path.join(os.homedir(), ".agelum", "user-settings.json");
  
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
      const project = settings.projects?.find((p: any) => p.name === opts.repo && p.type === "project");
      if (project && project.path) {
        projectRoot = project.path;
      }
    } catch (error) {
      console.error("Error reading user settings:", error);
    }
  }

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
