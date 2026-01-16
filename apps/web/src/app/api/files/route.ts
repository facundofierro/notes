import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
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

function buildFileTree(dir: string, basePath: string): FileNode | null {
  if (!fs.existsSync(dir)) return null

  const stats = fs.statSync(dir)
  if (!stats.isDirectory()) return null

  const name = path.basename(dir)
  const relativePath = path.relative(basePath, dir)

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const children = entries
    .filter(entry => {
      if (entry.name.startsWith('.')) return false
      if (entry.isDirectory()) return true
      return entry.isFile() && entry.name.endsWith('.md')
    })
    .map(entry => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return buildFileTree(fullPath, basePath)!
      } else {
        return {
          name: entry.name,
          path: fullPath,
          type: 'file' as const
        }
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'directory' ? -1 : 1
    })

  return {
    name,
    path: dir,
    type: 'directory',
    children
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const repo = searchParams.get('repo')
  const subPath = searchParams.get('path')

  if (!repo) {
    return NextResponse.json({ tree: null, rootPath: '' })
  }

  try {
    // Navigate up from the current working directory to get to the git directory
    // Current structure: /Users/facundofierro/git/agelum/apps/web
    // Target: /Users/facundofierro/git/{repo}
    const currentPath = process.cwd()
    const gitDir = path.dirname(path.dirname(path.dirname(currentPath)))
    
    const repoPath = path.join(gitDir, repo)
    const basePath = gitDir
    const agelumDir = path.join(repoPath, 'agelum')

    ensureAgelumStructure(agelumDir)

    const targetDir = subPath ? path.join(agelumDir, subPath) : agelumDir
    const tree = buildFileTree(targetDir, basePath)

    return NextResponse.json({
      tree: tree || { name: subPath || 'agelum', path: targetDir, type: 'directory', children: [] },
      rootPath: targetDir
    })
  } catch (error) {
    return NextResponse.json({ tree: null, rootPath: '' }, { status: 500 })
  }
}
