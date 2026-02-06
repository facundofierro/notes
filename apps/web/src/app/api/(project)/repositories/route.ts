import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ensureRootGitDirectory } from '@/lib/config'
import { readSettings } from '@/lib/settings'

// Server mode: when deployed (e.g., Vercel), will use database instead of filesystem
const SERVER_MODE = process.env.SERVER_MODE === 'true'

export async function GET() {
  try {
    if (SERVER_MODE) {
      // TODO: Implement database query for repositories
      return NextResponse.json({ 
        repositories: [], 
        basePath: 'server-mode',
        serverMode: true 
      })
    }

    // 1. Try to read from settings
    const settings = await readSettings();
    let repositories: { name: string; path: string; folderConfigId?: string }[] = [];
    
    if (settings.projects && settings.projects.length > 0) {
      for (const p of settings.projects) {
        if (p.type === 'project') {
          repositories.push({ name: p.name, path: p.path });
        } else if (p.type === 'folder') {
           if (fs.existsSync(p.path)) {
             try {
               const entries = fs.readdirSync(p.path, { withFileTypes: true });
               for (const entry of entries) {
                 if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    repositories.push({ 
                      name: entry.name, 
                      path: path.join(p.path, entry.name),
                      folderConfigId: p.id // Add reference to parent folder config
                    });
                 }
               }
             } catch (e) {
               console.error(`Error reading project folder ${p.path}:`, e);
             }
           }
        }
      }
      
      // Remove duplicates (by name)
      const uniqueRepos = new Map();
      for (const repo of repositories) {
        if (!uniqueRepos.has(repo.name)) {
          uniqueRepos.set(repo.name, repo);
        }
      }
      repositories = Array.from(uniqueRepos.values());
      
      return NextResponse.json({ repositories, basePath: '', serverMode: false })
    } 

    // 2. Fallback to legacy mode: use filesystem with global config
    const basePath = ensureRootGitDirectory()

    if (fs.existsSync(basePath)) {
      const entries = fs.readdirSync(basePath, { withFileTypes: true })
      repositories = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => ({ name: entry.name, path: path.join(basePath, entry.name) }))
    }

    return NextResponse.json({ repositories, basePath, serverMode: false })
  } catch (error) {
    return NextResponse.json({ 
      repositories: [], 
      basePath: '', 
      serverMode: SERVER_MODE,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
