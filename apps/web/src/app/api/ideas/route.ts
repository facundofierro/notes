import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface Idea {
  id: string
  title: string
  description: string
  state: 'thinking' | 'important' | 'priority' | 'planned' | 'done'
  createdAt: string
  path: string
}

function ensureIdeasStructure(agelumDir: string) {
  const directories = [
    path.join('ideas', 'thinking'),
    path.join('ideas', 'important'),
    path.join('ideas', 'priority'),
    path.join('ideas', 'planned'),
    path.join('ideas', 'done')
  ]

  for (const dir of directories) {
    fs.mkdirSync(path.join(agelumDir, dir), { recursive: true })
  }
}

function fileNameToId(fileName: string): string {
  return fileName.replace('.md', '')
}

function parseIdeaFile(filePath: string, state: 'thinking' | 'important' | 'priority' | 'planned' | 'done'): Idea | null {
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
      createdAt: stats.mtime.toISOString(),
      path: filePath
    }
  } catch {
    return null
  }
}

function readIdeas(repo: string): Idea[] {
  const homeDir = (process.env.HOME || process.env.USERPROFILE || process.cwd())
  const gitDir = path.join(homeDir, 'git')
  const agelumDir = path.join(gitDir, repo, 'agelum')
  ensureIdeasStructure(agelumDir)
  const ideasDir = path.join(agelumDir, 'ideas')

  const ideas: Idea[] = []
  const states = ['thinking', 'important', 'priority', 'planned', 'done'] as const

  for (const state of states) {
    const stateDir = path.join(ideasDir, state)
    if (!fs.existsSync(stateDir)) continue

    const files = fs.readdirSync(stateDir)
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const idea = parseIdeaFile(path.join(stateDir, file), state)
      if (idea) ideas.push(idea)
    }
  }

  return ideas
}

function createIdea(repo: string, data: { title: string; description?: string; state?: string }): Idea {
  const homeDir = (process.env.HOME || process.env.USERPROFILE || process.cwd())
  const gitDir = path.join(homeDir, 'git')
  const agelumDir = path.join(gitDir, repo, 'agelum')
  ensureIdeasStructure(agelumDir)
  const ideasDir = path.join(agelumDir, 'ideas')
  const state = (data.state as 'thinking' | 'important' | 'priority' | 'planned' | 'done') || 'thinking'

  const id = `idea-${Date.now()}`
  const stateDir = path.join(ideasDir, state)
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
    createdAt,
    path: filePath
  }
}

function findIdeaFile(baseDir: string, ideaId: string): string | null {
  if (!fs.existsSync(baseDir)) return null
  
  const items = fs.readdirSync(baseDir, { withFileTypes: true })
  
  for (const item of items) {
    if (item.isFile() && item.name === `${ideaId}.md`) {
      return path.join(baseDir, item.name)
    }
  }
  
  return null
}

function moveIdea(repo: string, ideaId: string, fromState: string, toState: string): void {
  const homeDir = (process.env.HOME || process.env.USERPROFILE || process.cwd())
  const gitDir = path.join(homeDir, 'git')
  const agelumDir = path.join(gitDir, repo, 'agelum')
  ensureIdeasStructure(agelumDir)
  const ideasDir = path.join(agelumDir, 'ideas')

  const fromStateDir = path.join(ideasDir, fromState)
  const fromPath = findIdeaFile(fromStateDir, ideaId)
  
  if (!fromPath) {
    throw new Error(`Idea file not found: ${ideaId}`)
  }

  const toStateDir = path.join(ideasDir, toState)
  fs.mkdirSync(toStateDir, { recursive: true })
  const toPath = path.join(toStateDir, `${ideaId}.md`)

  fs.renameSync(fromPath, toPath)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const repo = searchParams.get('repo')

  if (!repo) {
    return NextResponse.json({ ideas: [] })
  }

  const ideas = readIdeas(repo)
  return NextResponse.json({ ideas })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { repo, action, ideaId, fromState, toState, data } = body

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 })
    }

    if (action === 'create') {
      const idea = createIdea(repo, data || {})
      return NextResponse.json({ idea })
    }

    if (action === 'move' && ideaId && fromState && toState) {
      moveIdea(repo, ideaId, fromState, toState)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Idea API error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process idea'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
