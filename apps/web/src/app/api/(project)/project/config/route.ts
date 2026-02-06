
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
    const configPath = path.join(projectPath, '.agelum', 'config.json');
    
    let config: any = {};
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
    }

    // Auto-detect URL from package.json if not set
    if (!config.url) {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          if (deps.next) {
            config.url = 'http://localhost:3000';
          } else if (deps.vite) {
            config.url = 'http://localhost:5173'; 
          } else if (deps['react-scripts']) {
            config.url = 'http://localhost:3000';
          } else if (deps['@angular/cli']) {
            config.url = 'http://localhost:4200';
          } else if (deps['@vue/cli-service']) {
            config.url = 'http://localhost:8080';
          }
        } catch (e) {
          // Ignore package.json parsing errors
        }
      }
    }
    
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error reading project config:', error);
    return NextResponse.json({ error: 'Failed to read project config' }, { status: 500 });
  }
}
