'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  KanbanBoard, 
  type KanbanCardType, 
  type KanbanColumnType
} from '@agelum/kanban'
import { 
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea
} from '@agelum/shadcn'

interface Idea {
  id: string
  title: string
  description: string
  state: 'thinking' | 'important' | 'priority' | 'planned' | 'done'
  createdAt: string
  path: string
}

const columns: KanbanColumnType[] = [
  { id: 'thinking', title: 'Thinking', color: 'purple', order: 0 },
  { id: 'important', title: 'Important', color: 'orange', order: 1 },
  { id: 'priority', title: 'Priority', color: 'red', order: 2 },
  { id: 'planned', title: 'Planned', color: 'blue', order: 3 },
  { id: 'done', title: 'Done', color: 'green', order: 4 },
]

interface IdeasKanbanProps {
  repo: string
  onIdeaSelect: (idea: Idea) => void
}

export default function IdeasKanban({ repo, onIdeaSelect }: IdeasKanbanProps) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newIdeaColumn, setNewIdeaColumn] = useState('')
  const [newIdeaTitle, setNewIdeaTitle] = useState('')
  const [newIdeaDescription, setNewIdeaDescription] = useState('')

  const fetchIdeas = useCallback(async () => {
    const res = await fetch(`/api/ideas?repo=${encodeURIComponent(repo)}`)
    const data = await res.json()
    setIdeas(data.ideas || [])
  }, [repo])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas, refreshKey])

  const cards = ideas.map<KanbanCardType>((idea, index) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    columnId: idea.state,
    order: index,
  }))

  const handleAddCard = useCallback(
    async (columnId: string) => {
      setNewIdeaColumn(columnId)
      setNewIdeaTitle('')
      setNewIdeaDescription('')
      setIsAddDialogOpen(true)
    },
    []
  )

  const handleCreateIdea = useCallback(
    async () => {
      if (!newIdeaTitle.trim()) return

      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          action: 'create',
          data: { 
            title: newIdeaTitle.trim(), 
            description: newIdeaDescription.trim(), 
            state: newIdeaColumn 
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create idea')

      setRefreshKey((k) => k + 1)
      setIsAddDialogOpen(false)
      setNewIdeaTitle('')
      setNewIdeaDescription('')
    },
    [repo, newIdeaTitle, newIdeaDescription, newIdeaColumn]
  )

  const handleCardMove = useCallback(
    async (cardId: string, fromState: string, toState: string) => {
      setIdeas((prev) =>
        prev.map((i) => (i.id === cardId ? { ...i, state: toState as Idea['state'] } : i))
      )

      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          action: 'move',
          ideaId: cardId,
          fromState,
          toState,
        }),
      })

      if (!res.ok) {
        setRefreshKey((k) => k + 1)
        const data = await res.json()
        throw new Error(data.error || 'Failed to move idea')
      }

      setRefreshKey((k) => k + 1)
    },
    [repo]
  )

  return (
    <>
      <div className="h-full">
        <KanbanBoard
          columns={columns}
          cards={cards}
          onAddCard={handleAddCard}
          onCardMove={handleCardMove}
          onCardClick={(card: KanbanCardType) => {
            const idea = ideas.find((i) => i.id === card.id)
            if (idea) onIdeaSelect(idea)
          }}
          onCardEdit={(card: KanbanCardType) => {
            const idea = ideas.find((i) => i.id === card.id)
            if (idea) onIdeaSelect(idea)
          }}
          key={refreshKey}
        />
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Idea</DialogTitle>
            <DialogDescription>
              Add a new idea to {columns.find(c => c.id === newIdeaColumn)?.title || 'the board'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="idea-title">Title</Label>
              <Input
                id="idea-title"
                placeholder="Idea title"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleCreateIdea()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="idea-description">Description</Label>
              <Textarea
                id="idea-description"
                placeholder="Idea description (optional)"
                value={newIdeaDescription}
                onChange={(e) => setNewIdeaDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateIdea}
              disabled={!newIdeaTitle.trim()}
            >
              Create Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
