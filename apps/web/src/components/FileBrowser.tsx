'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, FilePlus, FolderPlus, Trash2, MoreVertical } from 'lucide-react'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from '@agelum/kanban'
import { Button } from '@agelum/shadcn'

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
  onRefresh?: () => void
}

function FileTreeNode({
  node,
  level = 0,
  onFileSelect,
  expandedPaths,
  toggleExpand,
  onDelete,
  onAddFile,
  onAddFolder
}: {
  node: FileNode
  level: number
  onFileSelect: (node: FileNode) => void
  expandedPaths: Set<string>
  toggleExpand: (path: string) => void
  onDelete: (path: string, type: 'file' | 'directory') => void
  onAddFile: (parentPath: string) => void
  onAddFolder: (parentPath: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const isExpanded = expandedPaths.has(node.path)
  const hasChildren = node.children && node.children.length > 0
  const isSelectable = node.type === 'file' || !hasChildren

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-1 py-1 px-2 hover:bg-gray-700 rounded relative ${
          isSelectable ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        <div
          className="flex items-center gap-1 flex-1"
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
        {showMenu && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.type === 'directory' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddFile(node.path)
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                  title="New file"
                >
                  <FilePlus className="w-3 h-3 text-gray-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddFolder(node.path)
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                  title="New folder"
                >
                  <FolderPlus className="w-3 h-3 text-gray-400" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete ${node.name}?`)) {
                  onDelete(node.path, node.type)
                }
              }}
              className="p-1 hover:bg-red-600 rounded"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        )}
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
              onDelete={onDelete}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileBrowser({ fileTree, onFileSelect, onRefresh }: FileBrowserProps) {
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

  const handleDelete = async (path: string, type: 'file' | 'directory') => {
    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
      })
      
      if (response.ok && onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleAddFile = async (parentPath: string) => {
    const fileName = prompt('Enter file name (with .md extension):')
    if (!fileName) return

    const filePath = `${parentPath}/${fileName}`
    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content: '' })
      })

      if (response.ok && onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to create file:', error)
    }
  }

  const handleAddFolder = async (parentPath: string) => {
    const folderName = prompt('Enter folder name:')
    if (!folderName) return

    const folderPath = `${parentPath}/${folderName}`
    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `${folderPath}/.gitkeep`, content: '' })
      })

      if (response.ok && onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
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
            onDelete={handleDelete}
            onAddFile={handleAddFile}
            onAddFolder={handleAddFolder}
          />
        ) : (
          <p className="text-sm text-gray-500 p-2">No repository selected</p>
        )}
      </div>
    </div>
  )
}
