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
  Textarea,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agelum/shadcn'
import { AgentExecutionStatus, type ExecutionStatus } from './AgentExecutionStatus'

interface Epic {
  id: string
  title: string
  description: string
  state: 'backlog' | 'priority' | 'pending' | 'doing' | 'done'
  createdAt: string
  path: string
}

const columns: KanbanColumnType[] = [
  { id: 'backlog', title: 'Backlog', color: 'gray', order: 0 },
  { id: 'priority', title: 'Priority', color: 'red', order: 1 },
  { id: 'pending', title: 'Pending', color: 'yellow', order: 2 },
  { id: 'doing', title: 'Doing', color: 'blue', order: 3 },
  { id: 'done', title: 'Done', color: 'green', order: 4 },
]

interface EpicsKanbanProps {
  repo: string
  onEpicSelect: (epic: Epic) => void
}

type CreationMode = 'direct' | 'agent'

interface AgentTool {
  name: string
  displayName: string
  available: boolean
}

export default function EpicsKanban({ repo, onEpicSelect }: EpicsKanbanProps) {
  const [epics, setEpics] = useState<Epic[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newEpicColumn, setNewEpicColumn] = useState('')
  const [newEpicTitle, setNewEpicTitle] = useState('')
  const [newEpicDescription, setNewEpicDescription] = useState('')
  
  // Agent mode state
  const [creationMode, setCreationMode] = useState<CreationMode>('direct')
  const [availableTools, setAvailableTools] = useState<AgentTool[]>([])
  const [selectedTool, setSelectedTool] = useState<string>('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [customModel, setCustomModel] = useState<string>('')
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle')
  const [executionOutput, setExecutionOutput] = useState<string>('')
  const [executionError, setExecutionError] = useState<string>('')

  const fetchEpics = useCallback(async () => {
    const res = await fetch(`/api/epics?repo=${encodeURIComponent(repo)}`)
    const data = await res.json()
    setEpics(data.epics || [])
  }, [repo])

  useEffect(() => {
    fetchEpics()
  }, [fetchEpics, refreshKey])

  const fetchAvailableTools = useCallback(async () => {
    try {
      const res = await fetch('/api/agents?action=tools')
      const data = await res.json()
      setAvailableTools(data.tools || [])
      // Auto-select first available tool
      const firstAvailable = data.tools?.find((t: AgentTool) => t.available)
      if (firstAvailable) {
        setSelectedTool(firstAvailable.name)
      }
    } catch (error) {
      console.error('Failed to fetch tools:', error)
    }
  }, [])

  const fetchModelsForTool = useCallback(async (toolName: string) => {
    try {
      const res = await fetch(`/api/agents?action=models&tool=${encodeURIComponent(toolName)}`)
      const data = await res.json()
      setAvailableModels(data.models || [])
    } catch (error) {
      console.error('Failed to fetch models:', error)
      setAvailableModels([])
    }
  }, [])

  // Fetch available agent tools when dialog opens
  useEffect(() => {
    if (isAddDialogOpen && creationMode === 'agent') {
      fetchAvailableTools()
    }
  }, [isAddDialogOpen, creationMode, fetchAvailableTools])

  // Fetch models when tool is selected
  useEffect(() => {
    if (selectedTool && creationMode === 'agent') {
      fetchModelsForTool(selectedTool)
    } else {
      setAvailableModels([])
      setSelectedModel('')
    }
  }, [selectedTool, creationMode, fetchModelsForTool])

  const cards = epics.map<KanbanCardType>((epic, index) => ({
    id: epic.id,
    title: epic.title,
    description: epic.description,
    columnId: epic.state,
    order: index,
  }))

  const handleAddCard = useCallback(
    async (columnId: string) => {
      setNewEpicColumn(columnId)
      setNewEpicTitle('')
      setNewEpicDescription('')
      setCreationMode('direct')
      setSelectedTool('')
      setSelectedModel('')
      setCustomModel('')
      setExecutionStatus('idle')
      setExecutionOutput('')
      setExecutionError('')
      setIsAddDialogOpen(true)
    },
    []
  )

  const handleCreateEpic = useCallback(
    async () => {
      if (!newEpicTitle.trim()) return

      if (creationMode === 'agent') {
        // Agent mode: execute agent command
        if (!selectedTool) {
          setExecutionError('Please select an agent tool')
          setExecutionStatus('error')
          return
        }

        setExecutionStatus('executing')
        setExecutionOutput('')
        setExecutionError('')

        try {
          // Calculate file path (same as direct creation)
          const homeDir = process.env.HOME || process.env.USERPROFILE || ''
          const gitDir = `${homeDir}/git`
          const agelumDir = `${gitDir}/${repo}/.agelum`
          const epicsDir = `${agelumDir}/work/epics`
          const state = newEpicColumn || 'backlog'
          const id = `epic-${Date.now()}`
          const filePath = `${epicsDir}/${state}/${id}.md`

          // Build prompt for agent
          const prompt = `Create an epic document at ${filePath} with title "${newEpicTitle.trim()}" and description "${newEpicDescription.trim()}". The file should be a markdown file with frontmatter containing title, created date (ISO format), and state ("${state}"). The content should start with a heading "# ${newEpicTitle.trim()}" followed by the description.`

          const model = selectedModel || customModel || undefined

          const res = await fetch('/api/epics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              repo,
              action: 'create',
              agentMode: true,
              data: {
                title: newEpicTitle.trim(),
                description: newEpicDescription.trim(),
                state: newEpicColumn,
              },
              agent: {
                tool: selectedTool,
                model,
                prompt,
              },
            }),
          })

          const data = await res.json()
          
          if (!res.ok) {
            setExecutionError(data.error || 'Failed to create epic with agent')
            setExecutionStatus('error')
            return
          }

          if (data.agentOutput) {
            setExecutionOutput(data.agentOutput.output || '')
            if (data.agentOutput.error) {
              setExecutionError(data.agentOutput.error)
            }
          }

          if (data.epic) {
            setExecutionStatus('success')
            // Wait a moment to show success, then refresh and close
            setTimeout(() => {
              setRefreshKey((k) => k + 1)
              setIsAddDialogOpen(false)
              setNewEpicTitle('')
              setNewEpicDescription('')
              setExecutionStatus('idle')
            }, 1500)
          } else {
            setExecutionStatus('error')
            setExecutionError('Epic was not created successfully')
          }
        } catch (error) {
          setExecutionError(error instanceof Error ? error.message : 'Failed to execute agent')
          setExecutionStatus('error')
        }
      } else {
        // Direct mode: create file directly
        const res = await fetch('/api/epics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo,
            action: 'create',
            data: { 
              title: newEpicTitle.trim(), 
              description: newEpicDescription.trim(), 
              state: newEpicColumn 
            },
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create epic')

        setRefreshKey((k) => k + 1)
        setIsAddDialogOpen(false)
        setNewEpicTitle('')
        setNewEpicDescription('')
      }
    },
    [repo, newEpicTitle, newEpicDescription, newEpicColumn, creationMode, selectedTool, selectedModel, customModel]
  )

  const handleCardMove = useCallback(
    async (cardId: string, fromState: string, toState: string) => {
      setEpics((prev) =>
        prev.map((e) => (e.id === cardId ? { ...e, state: toState as Epic['state'] } : e))
      )

      const res = await fetch('/api/epics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          action: 'move',
          epicId: cardId,
          fromState,
          toState,
        }),
      })

      if (!res.ok) {
        setRefreshKey((k) => k + 1)
        const data = await res.json()
        throw new Error(data.error || 'Failed to move epic')
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
            const epic = epics.find((e) => e.id === card.id)
            if (epic) onEpicSelect(epic)
          }}
          onCardEdit={(card: KanbanCardType) => {
            const epic = epics.find((e) => e.id === card.id)
            if (epic) onEpicSelect(epic)
          }}
          key={refreshKey}
        />
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Epic</DialogTitle>
            <DialogDescription>
              Add a new epic to {columns.find(c => c.id === newEpicColumn)?.title || 'the board'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Creation Mode Selection */}
            <div className="grid gap-2">
              <Label>Creation Mode</Label>
              <RadioGroup
                value={creationMode}
                onValueChange={(value: string) => setCreationMode(value as CreationMode)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="mode-direct" />
                  <Label htmlFor="mode-direct" className="font-normal cursor-pointer">
                    Direct
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agent" id="mode-agent" />
                  <Label htmlFor="mode-agent" className="font-normal cursor-pointer">
                    Agent
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Agent Options */}
            {creationMode === 'agent' && (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="agent-tool">Agent Tool</Label>
                  <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger id="agent-tool">
                      <SelectValue placeholder="Select an agent tool" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTools.map((tool) => (
                        <SelectItem
                          key={tool.name}
                          value={tool.name}
                          disabled={!tool.available}
                        >
                          {tool.displayName}
                          {!tool.available && ' (not installed)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTool && (
                  <>
                    {availableModels.length > 0 ? (
                      <div className="grid gap-2">
                        <Label htmlFor="agent-model">Model</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger id="agent-model">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Custom</SelectItem>
                            {availableModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    
                    {(selectedModel === '' || availableModels.length === 0) && (
                      <div className="grid gap-2">
                        <Label htmlFor="custom-model">Model (optional)</Label>
                        <Input
                          id="custom-model"
                          placeholder="Enter model name"
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                        />
                      </div>
                    )}

                    <AgentExecutionStatus
                      status={executionStatus}
                      output={executionOutput}
                      error={executionError}
                    />
                  </>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="grid gap-2">
              <Label htmlFor="epic-title">Title</Label>
              <Input
                id="epic-title"
                placeholder="Epic title"
                value={newEpicTitle}
                onChange={(e) => setNewEpicTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleCreateEpic()
                  }
                }}
                autoFocus
                disabled={executionStatus === 'executing'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="epic-description">Description</Label>
              <Textarea
                id="epic-description"
                placeholder="Epic description (optional)"
                value={newEpicDescription}
                onChange={(e) => setNewEpicDescription(e.target.value)}
                rows={4}
                disabled={executionStatus === 'executing'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={executionStatus === 'executing'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateEpic}
              disabled={!newEpicTitle.trim() || executionStatus === 'executing'}
            >
              {executionStatus === 'executing' ? 'Creating...' : 'Create Epic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
