
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('path');

  if (!projectPath) {
    return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
  }

  try {
    const cachePath = path.join(projectPath, '.agelum', 'cache', 'favicons.json');
    
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8');
      const favicons = JSON.parse(content);
      return NextResponse.json({ favicons });
    }
    
    return NextResponse.json({ favicons: [] });
  } catch (error) {
    console.error('Error reading project cache:', error);
    return NextResponse.json({ error: 'Failed to read project cache' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { path: projectPath, favicons } = await request.json();

    if (!projectPath) {
      return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
    }

    const cacheDir = path.join(projectPath, '.agelum', 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cachePath = path.join(cacheDir, 'favicons.json');
    fs.writeFileSync(cachePath, JSON.stringify(favicons, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving project cache:', error);
    return NextResponse.json({ error: 'Failed to save project cache' }, { status: 500 });
  }
}
