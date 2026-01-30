import { NextResponse } from 'next/server'
import fs from 'fs'

export async function POST(request: Request) {
  try {
    const { path: checkPath } = await request.json()
    
    if (!checkPath) {
      return NextResponse.json({ valid: false, error: 'Path is required' })
    }

    if (!fs.existsSync(checkPath)) {
      return NextResponse.json({ valid: false, error: 'Path does not exist' })
    }

    const stats = fs.statSync(checkPath)
    if (!stats.isDirectory()) {
      return NextResponse.json({ valid: false, error: 'Path is not a directory' })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    return NextResponse.json({ valid: false, error: 'Invalid path' })
  }
}
