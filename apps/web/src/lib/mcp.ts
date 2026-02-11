import fs from "node:fs";
import path from "node:path";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ensureAgelumStructure } from "./project";

// --- Types & Constants ---

type TaskState =
  | "backlog"
  | "priority"
  | "fixes"
  | "pending"
  | "doing"
  | "done";
type DocumentType =
  | "task"
  | "epic"
  | "plan"
  | "doc"
  | "command"
  | "skill"
  | "agent"
  | "context";

const nonTaskTypeToDir: Record<
  Exclude<DocumentType, "task">,
  string
> = {
  epic: "work/epics",
  plan: "doc/plan",
  doc: "doc/docs",
  command: "ai/commands",
  skill: "ai/skills",
  agent: "ai/agents",
  context: "doc/context",
};

// --- Helpers ---

function sanitizeFileNamePart(
  value: string,
): string {
  return value
    .replace(/[\/\\]/g, "-")
    .replace(/[\0<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureMdExtension(
  fileName: string,
): string {
  const trimmed = fileName.trim();
  if (
    trimmed
      .toLowerCase()
      .endsWith(".md")
  )
    return trimmed;
  return `${trimmed}.md`;
}

function formatStoryPoints(
  value: number,
): string {
  return Number.isInteger(value)
    ? String(value)
    : String(value);
}

function formatPriority(
  value: number,
): string {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      "priority must be a non-negative number",
    );
  }
  return String(
    Math.trunc(value),
  ).padStart(2, "0");
}

function getTimestampPrefix() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${year}_${month}_${day}-${hours}${minutes}${seconds}`;
}

function buildFileName(args: {
  type: DocumentType;
  title: string;
  priority?: number;
  storyPoints?: number;
}): string {
  const title = sanitizeFileNamePart(
    args.title,
  );
  if (!title)
    throw new Error(
      "title is required",
    );

  const prefix = getTimestampPrefix();

  if (args.type === "task") {
    if (args.priority === undefined)
      throw new Error(
        "priority is required for task",
      );
    if (args.storyPoints === undefined)
      throw new Error(
        "storyPoints is required for task",
      );
    const priority = formatPriority(
      args.priority,
    );
    const storyPoints =
      formatStoryPoints(
        args.storyPoints,
      );
    return `${prefix}-${priority} ${title} (${storyPoints}).md`;
  }

  if (args.storyPoints !== undefined) {
    const storyPoints =
      formatStoryPoints(
        args.storyPoints,
      );
    return `${prefix}-${title} (${storyPoints}).md`;
  }

  return `${prefix}-${title}.md`;
}

function buildFrontmatter(args: {
  type: DocumentType;
  title: string;
  state?: TaskState;
  priority?: number;
  storyPoints?: number;
  epic?: string;
}): string {
  const lines: string[] = [
    "---",
    `title: ${args.title}`,
    `created: ${new Date().toISOString()}`,
    `type: ${args.type}`,
  ];

  if (args.type === "task") {
    if (!args.state)
      throw new Error(
        "state is required for task",
      );
    lines.push(`state: ${args.state}`);
    if (args.priority !== undefined)
      lines.push(
        `priority: ${formatPriority(args.priority)}`,
      );
    if (args.storyPoints !== undefined)
      lines.push(
        `storyPoints: ${formatStoryPoints(args.storyPoints)}`,
      );
    if (args.epic)
      lines.push(`epic: ${args.epic}`);
  } else {
    if (args.storyPoints !== undefined)
      lines.push(
        `storyPoints: ${formatStoryPoints(args.storyPoints)}`,
      );
  }

  lines.push("---");
  return `${lines.join("\n")}\n`;
}

// --- Tools Definition ---

const tools: Record<string, Tool> = {
  create: {
    name: "create",
    description:
      "Create a new markdown file in the agelum structure. Returns the file path only.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "task",
            "epic",
            "plan",
            "doc",
            "command",
            "skill",
            "agent",
            "context",
          ],
          description: "Document type",
        },
        title: {
          type: "string",
          description:
            "Title used for naming and frontmatter",
        },
        content: {
          type: "string",
          description:
            "Markdown content body",
        },
        state: {
          type: "string",
          enum: [
            "backlog",
            "priority",
            "fixes",
            "pending",
            "doing",
            "done",
          ],
          default: "pending",
          description:
            "Task state (only for type=task)",
        },
        priority: {
          type: "number",
          description:
            "Task priority number (only for type=task)",
        },
        storyPoints: {
          type: "number",
          description:
            "Story points (type=task required, type=epic optional)",
        },
        fileName: {
          type: "string",
          description:
            "Override file name (optional, with or without .md)",
        },
        epic: {
          type: "string",
          description:
            "Epic name to group this task under (only for type=task)",
        },
      },
      required: ["type", "title"],
    },
  },
  move: {
    name: "move",
    description:
      "Move a task between states. Returns from/to paths only.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["task"],
          description:
            "Only task is supported",
        },
        title: {
          type: "string",
          description: "Task title",
        },
        priority: {
          type: "number",
          description:
            "Task priority number",
        },
        storyPoints: {
          type: "number",
          description:
            "Task story points",
        },
        fileName: {
          type: "string",
          description:
            "Override file name (optional)",
        },
        fromState: {
          type: "string",
          enum: [
            "backlog",
            "priority",
            "fixes",
            "pending",
            "doing",
            "done",
          ],
          description: "Current state",
        },
        toState: {
          type: "string",
          enum: [
            "backlog",
            "priority",
            "fixes",
            "pending",
            "doing",
            "done",
          ],
          description: "Target state",
        },
        epic: {
          type: "string",
          description:
            "Epic name if the task is grouped",
        },
      },
      required: [
        "type",
        "fromState",
        "toState",
      ],
    },
  },
  get: {
    name: "get",
    description:
      "Resolve a file path in the agelum structure. Returns the file path only.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "task",
            "epic",
            "plan",
            "doc",
            "command",
            "skill",
            "agent",
            "context",
          ],
          description: "Document type",
        },
        title: {
          type: "string",
          description:
            "Title used to build the file name (if fileName omitted)",
        },
        state: {
          type: "string",
          enum: [
            "backlog",
            "priority",
            "fixes",
            "pending",
            "doing",
            "done",
          ],
          description:
            "Task state (optional)",
        },
        priority: {
          type: "number",
          description:
            "Task priority number (only for type=task)",
        },
        storyPoints: {
          type: "number",
          description:
            "Story points (type=task required, type=epic optional)",
        },
        fileName: {
          type: "string",
          description:
            "Override file name (optional)",
        },
        epic: {
          type: "string",
          description:
            "Epic name if the task is grouped (only for type=task)",
        },
      },
      required: ["type"],
    },
  },
};

// --- Repo Discovery Logic ---

/**
 * Finds the repository root.
 * Prioritizes `process.cwd()` (Stdio mode).
 * If not found, falls back to `globalConfigRoot` (Service mode).
 */
export function findRepoRootPath(
  globalConfigRoot?: string,
): string | null {
  // 1. Try finding .git from current working directory (Stdio mode)
  console.error(
    `Agelum: Searching for .git starting from ${process.cwd()}`,
  );
  let currentPath = process.cwd();

  // Safety check: Don't walk up if we are in a system root or unexpected place
  // But for now, standard walking is fine.

  // We limit the walk to avoid infinite loops or going too far up in Docker
  const MAX_DEPTH = 10;
  let depth = 0;

  while (depth < MAX_DEPTH) {
    const gitPath = path.join(
      currentPath,
      ".git",
    );
    if (fs.existsSync(gitPath)) {
      console.error(
        `Agelum: Found .git at ${currentPath}`,
      );
      return currentPath;
    }

    const parentPath = path.dirname(
      currentPath,
    );
    if (parentPath === currentPath)
      break;
    currentPath = parentPath;
    depth++;
  }

  console.error(
    "Agelum: Could not find .git via CWD traversal.",
  );

  // 2. Fallback to Global Config (Service mode / Web App context)
  if (globalConfigRoot) {
    console.error(
      `Agelum: Falling back to global config root: ${globalConfigRoot}`,
    );
    if (
      fs.existsSync(globalConfigRoot)
    ) {
      // Check if it has .git or is a valid dir
      return globalConfigRoot;
    }
  }

  return null;
}

// --- Server Setup ---

export function createAgelumMcpServer(
  globalConfigRoot?: string,
) {
  const server = new Server(
    {
      name: "agelum",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      return {
        tools: Object.values(tools),
      };
    },
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      const { name, arguments: args } =
        request.params;

      try {
        const repoRootPath =
          findRepoRootPath(
            globalConfigRoot,
          );
        if (!repoRootPath)
          throw new Error(
            "Could not find repository root",
          );
        const agelumPath =
          ensureAgelumStructure(
            repoRootPath,
          );

        switch (name) {
          case "create": {
            let {
              type,
              title,
              content = "",
              state = "pending",
              priority,
              storyPoints,
              fileName,
              epic,
            } = args as {
              type: DocumentType;
              title: string;
              content?: string;
              state?: TaskState;
              priority?: number;
              storyPoints?: number;
              fileName?: string;
              epic?: string;
            };

            // Redirect legacy 'priority' to 'fixes'
            if (state === "priority") state = "fixes";

            const resolvedFileName =
              ensureMdExtension(
                sanitizeFileNamePart(
                  fileName ??
                    buildFileName({
                      type,
                      title,
                      priority,
                      storyPoints,
                    }),
                ),
              );

            let targetDir =
              type === "task"
                ? path.join(
                    agelumPath,
                    "work/tasks",
                    state,
                  )
                : path.join(
                    agelumPath,
                    nonTaskTypeToDir[
                      type
                    ],
                  );

            if (
              type === "task" &&
              epic
            ) {
              targetDir = path.join(
                targetDir,
                sanitizeFileNamePart(
                  epic,
                ),
              );
            }

            fs.mkdirSync(targetDir, {
              recursive: true,
            });
            const filePath = path.join(
              targetDir,
              resolvedFileName,
            );

            if (fs.existsSync(filePath))
              throw new Error(
                `File already exists: ${filePath}`,
              );

            const frontmatter =
              buildFrontmatter({
                type,
                title,
                state,
                priority,
                storyPoints,
                epic,
              });
            const body = `\n# ${title}\n\n${content}\n`;
            fs.writeFileSync(
              filePath,
              `${frontmatter}${body}`,
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    path: filePath,
                  }),
                },
              ],
            };
          }

          case "move": {
            let {
              type,
              title = "",
              priority,
              storyPoints,
              fileName,
              fromState,
              toState,
              epic,
            } = args as {
              type: "task";
              title?: string;
              priority?: number;
              storyPoints?: number;
              fileName?: string;
              fromState: TaskState;
              toState: TaskState;
              epic?: string;
            };

            // Redirect legacy 'priority' to 'fixes'
            if (toState === "priority") toState = "fixes";

            if (fromState === toState) {
              throw new Error(
                "fromState and toState must be different",
              );
            }

            let sourceFileName =
              fileName;
            if (!sourceFileName) {
              if (!title)
                throw new Error(
                  "title is required if fileName is not provided",
                );
              sourceFileName =
                buildFileName({
                  type,
                  title,
                  priority,
                  storyPoints,
                });
            }
            sourceFileName =
              ensureMdExtension(
                sourceFileName,
              );

            let sourceDir = path.join(
              agelumPath,
              "work/tasks",
              fromState,
            );
            if (epic) {
              sourceDir = path.join(
                sourceDir,
                sanitizeFileNamePart(
                  epic,
                ),
              );
            }

            const sourcePath =
              path.join(
                sourceDir,
                sourceFileName,
              );

            if (
              !fs.existsSync(sourcePath)
            ) {
              throw new Error(
                `Source file not found: ${sourcePath}`,
              );
            }

            let targetDir = path.join(
              agelumPath,
              "work/tasks",
              toState,
            );
            if (epic) {
              targetDir = path.join(
                targetDir,
                sanitizeFileNamePart(
                  epic,
                ),
              );
            }

            fs.mkdirSync(targetDir, {
              recursive: true,
            });

            let targetFileName = sourceFileName;
            if (toState === "done") {
              const hasPrefix = /^\d{2}_\d{2}_\d{2}-\d{6}-/.test(sourceFileName);
              if (!hasPrefix) {
                targetFileName = `${getTimestampPrefix()}-${sourceFileName}`;
              }
            }

            const targetPath =
              path.join(
                targetDir,
                targetFileName,
              );

            if (
              fs.existsSync(targetPath)
            ) {
              throw new Error(
                `Target file already exists: ${targetPath}`,
              );
            }

            fs.renameSync(
              sourcePath,
              targetPath,
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    from: sourcePath,
                    to: targetPath,
                  }),
                },
              ],
            };
          }

          case "get": {
            let {
              type,
              title = "",
              state,
              priority,
              storyPoints,
              fileName,
              epic,
            } = args as {
              type: DocumentType;
              title?: string;
              state?: TaskState;
              priority?: number;
              storyPoints?: number;
              fileName?: string;
              epic?: string;
            };

            // Redirect legacy 'priority' to 'fixes'
            if (state === "priority") state = "fixes";

            let resolvedFileName =
              fileName;
            if (!resolvedFileName) {
              if (!title)
                throw new Error(
                  "title is required if fileName is not provided",
                );
              if (type === "task") {
                if (
                  priority !==
                    undefined &&
                  storyPoints !==
                    undefined
                ) {
                  resolvedFileName =
                    buildFileName({
                      type,
                      title,
                      priority,
                      storyPoints,
                    });
                } else {
                  // For get, if priority/SP missing, we assume title matches (might fail if not exact)
                  // Or could assume user provided exact filename in title? No, buildFileName handles logic.
                  // If incomplete, let's try just title if it's the simple case, but buildFileName throws.
                  // Let's assume user provides correct params or fileName.
                  try {
                    resolvedFileName =
                      buildFileName({
                        type,
                        title,
                        priority,
                        storyPoints,
                      });
                  } catch (e) {
                    // Fallback: try just title.md? No, convention is strict.
                    throw new Error(
                      "Insufficient arguments to build filename. Provide fileName or all task attributes.",
                    );
                  }
                }
              } else {
                resolvedFileName =
                  buildFileName({
                    type,
                    title,
                    priority,
                    storyPoints,
                  });
              }
            }

            let searchPath = "";
            if (type === "task") {
              if (state) {
                searchPath = path.join(
                  agelumPath,
                  "work/tasks",
                  state,
                );
                if (epic) {
                  searchPath =
                    path.join(
                      searchPath,
                      sanitizeFileNamePart(
                        epic,
                      ),
                    );
                }
                searchPath = path.join(
                  searchPath,
                  resolvedFileName,
                );
              } else {
                // Search in all states?
                // "get" usually implies knowing where it is.
                // But for convenience, we could check pending/doing/done?
                // For now, let's just return what we can if state is provided.
                // If state is NOT provided, we can't reliably find it without searching.
                // Let's assume state is optional but we try to find it.
                const states: TaskState[] =
                  [
                    "backlog",
                    "priority",
                    "fixes",
                    "pending",
                    "doing",
                    "done",
                  ];
                let foundPath:
                  | string
                  | null = null;

                for (const s of states) {
                  let dir = path.join(
                    agelumPath,
                    "work/tasks",
                    s,
                  );
                  if (epic)
                    dir = path.join(
                      dir,
                      sanitizeFileNamePart(
                        epic,
                      ),
                    );
                  const p = path.join(
                    dir,
                    resolvedFileName,
                  );
                  if (
                    fs.existsSync(p)
                  ) {
                    foundPath = p;
                    break;
                  }
                }

                if (!foundPath) {
                  throw new Error(
                    `File not found: ${resolvedFileName} (searched in ${epic ? "epic " + epic : "all states"})`,
                  );
                }
                searchPath = foundPath;
              }
            } else {
              searchPath = path.join(
                agelumPath,
                nonTaskTypeToDir[type],
                resolvedFileName,
              );
            }

            if (
              !fs.existsSync(searchPath)
            ) {
              throw new Error(
                `File not found: ${searchPath}`,
              );
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    path: searchPath,
                  }),
                },
              ],
            };
          }

          default:
            throw new Error(
              `Unknown tool: ${name}`,
            );
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
