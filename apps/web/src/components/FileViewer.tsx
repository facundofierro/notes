'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Edit, Save, X, ArrowLeft } from 'lucide-react'
import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then((mod) => mod.default),
  { ssr: false }
)

interface FileViewerProps {
  file: { path: string; content: string } | null
  onFileSaved?: () => void
  onBack?: () => void
  onRename?: (newTitle: string) => Promise<{ path: string; content: string } | void>
}

export default function FileViewer({ file, onFileSaved, onBack, onRename }: FileViewerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isRenamingSaving, setIsRenamingSaving] = useState(false)

  useEffect(() => {
    if (file) {
      setContent(file.content)
      setIsEditing(false)
      setIsRenaming(false)
      setRenameValue('')
    }
  }, [file])

  const handleSave = async () => {
    if (!file) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path, content })
      })

      if (response.ok) {
        setIsEditing(false)
        if (onFileSaved) onFileSaved()
      }
    } catch (error) {
      console.error('Failed to save file:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setContent(file?.content || '')
    setIsEditing(false)
  }

  const displayedFileName = file?.path.split('/').pop() || ''
  const displayedTitle = displayedFileName.endsWith('.md')
    ? displayedFileName.replace(/\.md$/, '')
    : displayedFileName

  const commitRename = useCallback(async () => {
    if (!file || !onRename) return

    const nextTitle = renameValue.trim()
    if (!nextTitle) {
      setIsRenaming(false)
      setRenameValue('')
      return
    }

    setIsRenamingSaving(true)
    try {
      const result = await onRename(nextTitle)
      if (result?.content !== undefined) {
        setContent(result.content)
      }
      setIsRenaming(false)
    } finally {
      setIsRenamingSaving(false)
    }
  }, [file, onRename, renameValue])

  useEffect(() => {
    if (!file) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      if (isRenaming) {
        e.preventDefault()
        setIsRenaming(false)
        setRenameValue('')
        return
      }

      if (isEditing) {
        e.preventDefault()
        handleCancel()
        return
      }

      if (onBack) {
        e.preventDefault()
        onBack()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [file, isEditing, isRenaming, onBack])

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a file to view</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 mr-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <FileText className="w-4 h-4 text-gray-400" />
          {isRenaming ? (
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                if (!isRenamingSaving) commitRename()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (!isRenamingSaving) commitRename()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setIsRenaming(false)
                  setRenameValue('')
                }
              }}
              className="bg-gray-700 text-gray-100 text-sm rounded border border-gray-600 px-2 py-1 w-[320px]"
              autoFocus
              disabled={isRenamingSaving}
            />
          ) : (
            <span
              className={`text-sm font-medium text-gray-200 truncate ${onRename ? 'cursor-text' : ''}`}
              onDoubleClick={() => {
                if (!onRename) return
                setRenameValue(displayedTitle)
                setIsRenaming(true)
              }}
              title={onRename ? 'Double click to rename' : undefined}
            >
              {displayedTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 truncate max-w-md mr-4">{file.path}</span>
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto" data-color-mode="dark">
        {isEditing ? (
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height="100%"
            preview="edit"
            hideToolbar={false}
          />
        ) : (
          <div className="p-4">
            <MarkdownPreview
              source={content}
              style={{
                background: 'transparent',
                color: '#d1d5db',
                fontSize: '14px'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
