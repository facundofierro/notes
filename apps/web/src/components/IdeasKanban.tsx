'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  KanbanBoard, 
  type KanbanCardType, 
  type KanbanColumnType
} from '@agelum/kanban'

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
  onCreateIdea?: (opts: { state: Idea['state'] }) => void
}

export default function IdeasKanban({ repo, onIdeaSelect, onCreateIdea }: IdeasKanbanProps) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

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
    (columnId: string) => {
      onCreateIdea?.({ state: columnId as Idea['state'] })
    },
    [onCreateIdea]
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
  )
}
