import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface Task {
  id: string
  title: string
  description: string
  state: 'pending' | 'doing' | 'done'
  createdAt: string
}

function ensureAgelumStructure(agelumDir: string) {
  const directories = [
    'plan',
    'ideas',
    'epics',
    'docs',
    'context',
    'actions',
    'skills',
    path.join('tasks', 'doing'),
    path.join('tasks', 'done'),
    path.join('tasks', 'pending')
  ]

  fs.mkdirSync(agelumDir, { recursive: true })
  for (const dir of directories) {
    fs.mkdirSync(path.join(agelumDir, dir), { recursive: true })
  }
}

function fileNameToId(fileName: string): string {
  return fileName.replace('.md', '')
}

function parseTaskFile(filePath: string, state: 'pending' | 'doing' | 'done'): Task | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const fileName = path.basename(filePath)
    const stats = fs.statSync(filePath)

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    let title = fileNameToId(fileName)
    let description = ''

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      const titleMatch = frontmatter.match(/title:\s*(.+)/)
      description = frontmatter.match(/description:\s*(.+)/)?.[1] || ''
      if (titleMatch) {
        title = titleMatch[1].trim()
      }
    }

    return {
      id: fileNameToId(fileName),
      title,
      description,
      state,
      createdAt: stats.mtime.toISOString()
    }
  } catch {
    return null
  }
}

function readTasks(repo: string): Task[] {
  const homeDir = (process.env.HOME || process.env.USERPROFILE || process.cwd())
  const gitDir = path.join(homeDir, 'git')
  const agelumDir = path.join(gitDir, repo, 'agelum')
  ensureAgelumStructure(agelumDir)
  const tasksDir = path.join(agelumDir, 'tasks')

  const tasks: Task[] = []
  const states = ['pending', 'doing', 'done'] as const

  for (const state of states) {
    const stateDir = path.join(tasksDir, state)
    if (!fs.existsSync(stateDir)) continue

    const files = fs.readdirSync(stateDir)
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const task = parseTaskFile(path.join(stateDir, file), state)
      if (task) tasks.push(task)
    }
  }

  return tasks
}

function createTask(repo: string, data: { title: string; description?: string; state?: string }): Task {
  const homeDir = (process.env.HOME || process.env.USERPROFILE || process.cwd())
  const gitDir = path.join(homeDir, 'git')
  const agelumDir = path.join(gitDir, repo, 'agelum')
  ensureAgelumStructure(agelumDir)
  const tasksDir = path.join(agelumDir, 'tasks')
  const state = (data.state as 'pending' | 'doing' | 'done') || 'pending'

  const id = `task-${Date.now()}`
  const stateDir = path.join(tasksDir, state)
  fs.mkdirSync(stateDir, { recursive: true })

  const filePath = path.join(stateDir, `${id}.md`)
  const createdAt = new Date().toISOString()

  const frontmatter = `---
title: ${data.title}
created: ${createdAt}
state: ${state}
---
`

  fs.writeFileSync(filePath, `${frontmatter}\n# ${data.title}\n\n${data.description || ''}\n`)

  return {
    id,
    title: data.title,
    description: data.description || '',
    state,
    createdAt
  }
}

function moveTask(repo: string, taskId: string, fromState: string, toState: string): void {
  const homeDir = (process.env.HOME || process.env.USERPROFILE || process.cwd())
  const gitDir = path.join(homeDir, 'git')
  const agelumDir = path.join(gitDir, repo, 'agelum')
  ensureAgelumStructure(agelumDir)
  const tasksDir = path.join(agelumDir, 'tasks')

  const fromPath = path.join(tasksDir, fromState, `${taskId}.md`)
  const toPath = path.join(tasksDir, toState, `${taskId}.md`)

  const toDir = path.dirname(toPath)
  fs.mkdirSync(toDir, { recursive: true })

  fs.renameSync(fromPath, toPath)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const repo = searchParams.get('repo')

  if (!repo) {
    return NextResponse.json({ tasks: [] })
  }

  const tasks = readTasks(repo)
  return NextResponse.json({ tasks })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { repo, action, taskId, fromState, toState, data } = body

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 })
    }

    if (action === 'create') {
      const task = createTask(repo, data || {})
      return NextResponse.json({ task })
    }

    if (action === 'move' && taskId && fromState && toState) {
      moveTask(repo, taskId, fromState, toState)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process task' }, { status: 500 })
  }
}
