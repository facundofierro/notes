'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  content?: string
}

interface FileBrowserProps {
  fileTree: FileNode | null
  currentPath: string
  onFileSelect: (node: FileNode) => void
  basePath: string
}

function FileTreeNode({
  node,
  level = 0,
  onFileSelect,
  expandedPaths,
  toggleExpand
}: {
  node: FileNode
  level: number
  onFileSelect: (node: FileNode) => void
  expandedPaths: Set<string>
  toggleExpand: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const hasChildren = node.children && node.children.length > 0
  const isSelectable = node.type === 'file' || !hasChildren

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-700 rounded cursor-pointer ${
          isSelectable ? '' : 'cursor-default'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) {
            toggleExpand(node.path)
          }
          if (node.type === 'file') {
            onFileSelect(node)
          }
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )
        ) : (
          <span className="w-4" />
        )}
        {node.type === 'directory' ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-400" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-400" />
          )
        ) : (
          <FileText className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-sm text-gray-200">{node.name}</span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileBrowser({ fileTree, onFileSelect }: FileBrowserProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!fileTree) return
    
    const allPaths = new Set<string>()
    const collectPaths = (node: FileNode) => {
      if (node.type === 'directory') {
        allPaths.add(node.path)
        node.children?.forEach(collectPaths)
      }
    }
    collectPaths(fileTree)
    setExpandedPaths(allPaths)
  }, [fileTree])

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        {fileTree ? (
          <FileTreeNode
            node={fileTree}
            level={0}
            onFileSelect={onFileSelect}
            expandedPaths={expandedPaths}
            toggleExpand={toggleExpand}
          />
        ) : (
          <p className="text-sm text-gray-500 p-2">No repository selected</p>
        )}
      </div>
    </div>
  )
}
