import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ content: '' })
  }

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ content: '' })
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    return NextResponse.json({ content })
  } catch (error) {
    return NextResponse.json({ content: '' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { path: filePath, content, action, newPath } = body

    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (action === 'rename' && newPath) {
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Source path does not exist' }, { status: 404 })
      }
      if (fs.existsSync(newPath)) {
        return NextResponse.json({ error: 'Target path already exists' }, { status: 400 })
      }
      const dir = path.dirname(newPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.renameSync(filePath, newPath)
      return NextResponse.json({ success: true, path: newPath })
    }

    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, content || '')
    return NextResponse.json({ success: true, path: filePath })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 })
    }

    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
