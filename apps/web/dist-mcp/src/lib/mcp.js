"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRepoRootPath = findRepoRootPath;
exports.createAgelumMcpServer = createAgelumMcpServer;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const project_1 = require("./project");
const nonTaskTypeToDir = {
    epic: "work/epics",
    plan: "doc/plan",
    doc: "doc/docs",
    command: "ai/commands",
    skill: "ai/skills",
    agent: "ai/agents",
    context: "doc/context",
};
// --- Helpers ---
function sanitizeFileNamePart(value) {
    return value
        .replace(/[\/\\]/g, "-")
        .replace(/[\0<>:"|?*]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
function ensureMdExtension(fileName) {
    const trimmed = fileName.trim();
    if (trimmed
        .toLowerCase()
        .endsWith(".md"))
        return trimmed;
    return `${trimmed}.md`;
}
function formatStoryPoints(value) {
    return Number.isInteger(value)
        ? String(value)
        : String(value);
}
function formatPriority(value) {
    if (!Number.isFinite(value) ||
        value < 0) {
        throw new Error("priority must be a non-negative number");
    }
    return String(Math.trunc(value)).padStart(2, "0");
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
function buildFileName(args) {
    const title = sanitizeFileNamePart(args.title);
    if (!title)
        throw new Error("title is required");
    const prefix = getTimestampPrefix();
    if (args.type === "task") {
        if (args.priority === undefined)
            throw new Error("priority is required for task");
        if (args.storyPoints === undefined)
            throw new Error("storyPoints is required for task");
        const priority = formatPriority(args.priority);
        const storyPoints = formatStoryPoints(args.storyPoints);
        return `${prefix}-${priority} ${title} (${storyPoints}).md`;
    }
    if (args.storyPoints !== undefined) {
        const storyPoints = formatStoryPoints(args.storyPoints);
        return `${prefix}-${title} (${storyPoints}).md`;
    }
    return `${prefix}-${title}.md`;
}
function buildFrontmatter(args) {
    const lines = [
        "---",
        `title: ${args.title}`,
        `created: ${new Date().toISOString()}`,
        `type: ${args.type}`,
    ];
    if (args.type === "task") {
        if (!args.state)
            throw new Error("state is required for task");
        lines.push(`state: ${args.state}`);
        if (args.priority !== undefined)
            lines.push(`priority: ${formatPriority(args.priority)}`);
        if (args.storyPoints !== undefined)
            lines.push(`storyPoints: ${formatStoryPoints(args.storyPoints)}`);
        if (args.epic)
            lines.push(`epic: ${args.epic}`);
    }
    else {
        if (args.storyPoints !== undefined)
            lines.push(`storyPoints: ${formatStoryPoints(args.storyPoints)}`);
    }
    lines.push("---");
    return `${lines.join("\n")}\n`;
}
// --- Tools Definition ---
const tools = {
    create: {
        name: "create",
        description: "Create a new markdown file in the agelum structure. Returns the file path only.",
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
                    description: "Title used for naming and frontmatter",
                },
                content: {
                    type: "string",
                    description: "Markdown content body",
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
                    description: "Task state (only for type=task)",
                },
                priority: {
                    type: "number",
                    description: "Task priority number (only for type=task)",
                },
                storyPoints: {
                    type: "number",
                    description: "Story points (type=task required, type=epic optional)",
                },
                fileName: {
                    type: "string",
                    description: "Override file name (optional, with or without .md)",
                },
                epic: {
                    type: "string",
                    description: "Epic name to group this task under (only for type=task)",
                },
            },
            required: ["type", "title"],
        },
    },
    move: {
        name: "move",
        description: "Move a task between states. Returns from/to paths only.",
        inputSchema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["task"],
                    description: "Only task is supported",
                },
                title: {
                    type: "string",
                    description: "Task title",
                },
                priority: {
                    type: "number",
                    description: "Task priority number",
                },
                storyPoints: {
                    type: "number",
                    description: "Task story points",
                },
                fileName: {
                    type: "string",
                    description: "Override file name (optional)",
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
                    description: "Epic name if the task is grouped",
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
        description: "Resolve a file path in the agelum structure. Returns the file path only.",
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
                    description: "Title used to build the file name (if fileName omitted)",
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
                    description: "Task state (optional)",
                },
                priority: {
                    type: "number",
                    description: "Task priority number (only for type=task)",
                },
                storyPoints: {
                    type: "number",
                    description: "Story points (type=task required, type=epic optional)",
                },
                fileName: {
                    type: "string",
                    description: "Override file name (optional)",
                },
                epic: {
                    type: "string",
                    description: "Epic name if the task is grouped (only for type=task)",
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
function findRepoRootPath(globalConfigRoot) {
    // 1. Try finding .git from current working directory (Stdio mode)
    console.error(`Agelum: Searching for .git starting from ${process.cwd()}`);
    let currentPath = process.cwd();
    // Safety check: Don't walk up if we are in a system root or unexpected place
    // But for now, standard walking is fine.
    // We limit the walk to avoid infinite loops or going too far up in Docker
    const MAX_DEPTH = 10;
    let depth = 0;
    while (depth < MAX_DEPTH) {
        const gitPath = node_path_1.default.join(currentPath, ".git");
        if (node_fs_1.default.existsSync(gitPath)) {
            console.error(`Agelum: Found .git at ${currentPath}`);
            return currentPath;
        }
        const parentPath = node_path_1.default.dirname(currentPath);
        if (parentPath === currentPath)
            break;
        currentPath = parentPath;
        depth++;
    }
    console.error("Agelum: Could not find .git via CWD traversal.");
    // 2. Fallback to Global Config (Service mode / Web App context)
    if (globalConfigRoot) {
        console.error(`Agelum: Falling back to global config root: ${globalConfigRoot}`);
        if (node_fs_1.default.existsSync(globalConfigRoot)) {
            // Check if it has .git or is a valid dir
            return globalConfigRoot;
        }
    }
    return null;
}
// --- Server Setup ---
function createAgelumMcpServer(globalConfigRoot) {
    const server = new index_js_1.Server({
        name: "agelum",
        version: "0.1.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
        return {
            tools: Object.values(tools),
        };
    });
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            const repoRootPath = findRepoRootPath(globalConfigRoot);
            if (!repoRootPath)
                throw new Error("Could not find repository root");
            const agelumPath = (0, project_1.ensureAgelumStructure)(repoRootPath);
            switch (name) {
                case "create": {
                    let { type, title, content = "", state = "pending", priority, storyPoints, fileName, epic, } = args;
                    // Redirect legacy 'priority' to 'fixes'
                    if (state === "priority")
                        state = "fixes";
                    const resolvedFileName = ensureMdExtension(sanitizeFileNamePart(fileName ??
                        buildFileName({
                            type,
                            title,
                            priority,
                            storyPoints,
                        })));
                    let targetDir = type === "task"
                        ? node_path_1.default.join(agelumPath, "work/tasks", state)
                        : node_path_1.default.join(agelumPath, nonTaskTypeToDir[type]);
                    if (type === "task" &&
                        epic) {
                        targetDir = node_path_1.default.join(targetDir, sanitizeFileNamePart(epic));
                    }
                    node_fs_1.default.mkdirSync(targetDir, {
                        recursive: true,
                    });
                    const filePath = node_path_1.default.join(targetDir, resolvedFileName);
                    if (node_fs_1.default.existsSync(filePath))
                        throw new Error(`File already exists: ${filePath}`);
                    const frontmatter = buildFrontmatter({
                        type,
                        title,
                        state,
                        priority,
                        storyPoints,
                        epic,
                    });
                    const body = `\n# ${title}\n\n${content}\n`;
                    node_fs_1.default.writeFileSync(filePath, `${frontmatter}${body}`);
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
                    let { type, title = "", priority, storyPoints, fileName, fromState, toState, epic, } = args;
                    // Redirect legacy 'priority' to 'fixes'
                    if (toState === "priority")
                        toState = "fixes";
                    if (fromState === toState) {
                        throw new Error("fromState and toState must be different");
                    }
                    let sourceFileName = fileName;
                    if (!sourceFileName) {
                        if (!title)
                            throw new Error("title is required if fileName is not provided");
                        sourceFileName =
                            buildFileName({
                                type,
                                title,
                                priority,
                                storyPoints,
                            });
                    }
                    sourceFileName =
                        ensureMdExtension(sourceFileName);
                    let sourceDir = node_path_1.default.join(agelumPath, "work/tasks", fromState);
                    if (epic) {
                        sourceDir = node_path_1.default.join(sourceDir, sanitizeFileNamePart(epic));
                    }
                    const sourcePath = node_path_1.default.join(sourceDir, sourceFileName);
                    if (!node_fs_1.default.existsSync(sourcePath)) {
                        throw new Error(`Source file not found: ${sourcePath}`);
                    }
                    let targetDir = node_path_1.default.join(agelumPath, "work/tasks", toState);
                    if (epic) {
                        targetDir = node_path_1.default.join(targetDir, sanitizeFileNamePart(epic));
                    }
                    node_fs_1.default.mkdirSync(targetDir, {
                        recursive: true,
                    });
                    let targetFileName = sourceFileName;
                    if (toState === "done") {
                        const hasPrefix = /^\d{2}_\d{2}_\d{2}-\d{6}-/.test(sourceFileName);
                        if (!hasPrefix) {
                            targetFileName = `${getTimestampPrefix()}-${sourceFileName}`;
                        }
                    }
                    const targetPath = node_path_1.default.join(targetDir, targetFileName);
                    if (node_fs_1.default.existsSync(targetPath)) {
                        throw new Error(`Target file already exists: ${targetPath}`);
                    }
                    node_fs_1.default.renameSync(sourcePath, targetPath);
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
                    let { type, title = "", state, priority, storyPoints, fileName, epic, } = args;
                    // Redirect legacy 'priority' to 'fixes'
                    if (state === "priority")
                        state = "fixes";
                    let resolvedFileName = fileName;
                    if (!resolvedFileName) {
                        if (!title)
                            throw new Error("title is required if fileName is not provided");
                        if (type === "task") {
                            if (priority !==
                                undefined &&
                                storyPoints !==
                                    undefined) {
                                resolvedFileName =
                                    buildFileName({
                                        type,
                                        title,
                                        priority,
                                        storyPoints,
                                    });
                            }
                            else {
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
                                }
                                catch (e) {
                                    // Fallback: try just title.md? No, convention is strict.
                                    throw new Error("Insufficient arguments to build filename. Provide fileName or all task attributes.");
                                }
                            }
                        }
                        else {
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
                            searchPath = node_path_1.default.join(agelumPath, "work/tasks", state);
                            if (epic) {
                                searchPath =
                                    node_path_1.default.join(searchPath, sanitizeFileNamePart(epic));
                            }
                            searchPath = node_path_1.default.join(searchPath, resolvedFileName);
                        }
                        else {
                            // Search in all states?
                            // "get" usually implies knowing where it is.
                            // But for convenience, we could check pending/doing/done?
                            // For now, let's just return what we can if state is provided.
                            // If state is NOT provided, we can't reliably find it without searching.
                            // Let's assume state is optional but we try to find it.
                            const states = [
                                "backlog",
                                "priority",
                                "fixes",
                                "pending",
                                "doing",
                                "done",
                            ];
                            let foundPath = null;
                            for (const s of states) {
                                let dir = node_path_1.default.join(agelumPath, "work/tasks", s);
                                if (epic)
                                    dir = node_path_1.default.join(dir, sanitizeFileNamePart(epic));
                                const p = node_path_1.default.join(dir, resolvedFileName);
                                if (node_fs_1.default.existsSync(p)) {
                                    foundPath = p;
                                    break;
                                }
                            }
                            if (!foundPath) {
                                throw new Error(`File not found: ${resolvedFileName} (searched in ${epic ? "epic " + epic : "all states"})`);
                            }
                            searchPath = foundPath;
                        }
                    }
                    else {
                        searchPath = node_path_1.default.join(agelumPath, nonTaskTypeToDir[type], resolvedFileName);
                    }
                    if (!node_fs_1.default.existsSync(searchPath)) {
                        throw new Error(`File not found: ${searchPath}`);
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
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
        catch (error) {
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
    });
    return server;
}
