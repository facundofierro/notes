'use client'

import { useState, useEffect, useCallback } from 'react'
import { DataViews, tableSchema, type IRecord, type IDataViewsClient, type TableSchema } from 'shadcn-data-views'

interface Epic {
  id: string
  title: string
  description: string
  state: 'backlog' | 'priority' | 'pending' | 'doing' | 'done'
  createdAt: string
  path: string
}

const epicSchema: TableSchema = {
  id: 'epics',
  name: 'Epics',
  fields: [
    { id: 'title', name: 'Title', type: 'text', isPrimary: true },
    { id: 'description', name: 'Description', type: 'text' },
    { id: 'status', name: 'Status', type: 'select', options: [
      { id: 'backlog', name: 'Backlog', color: 'gray' },
      { id: 'priority', name: 'Priority', color: 'red' },
      { id: 'pending', name: 'Pending', color: 'yellow' },
      { id: 'doing', name: 'Doing', color: 'blue' },
      { id: 'done', name: 'Done', color: 'green' }
    ]},
    { id: 'createdAt', name: 'Created', type: 'date' }
  ]
}

const epicStatusOptions = epicSchema.fields.find((f) => f.id === 'status' && f.type === 'select')?.options || []
const epicStatusIdToName = new Map(epicStatusOptions.map((o) => [o.id, o.name]))
const epicStatusNameToId = new Map(epicStatusOptions.map((o) => [o.name, o.id]))

const toEpicUiStatus = (value: string) => epicStatusIdToName.get(value) || value
const toEpicApiStatus = (value: string) => epicStatusNameToId.get(value) || value

interface EpicsKanbanProps {
  repo: string
  onEpicSelect: (epic: Epic) => void
}

export default function EpicsKanban({ repo, onEpicSelect }: EpicsKanbanProps) {
  const [epics, setEpics] = useState<Epic[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchEpics = useCallback(async () => {
    const res = await fetch(`/api/epics?repo=${encodeURIComponent(repo)}`)
    const data = await res.json()
    setEpics(data.epics || [])
  }, [repo])

  useEffect(() => {
    fetchEpics()
  }, [fetchEpics, refreshKey])

  const createRecord = useCallback(async (record: Partial<IRecord>): Promise<IRecord> => {
    const title = record.fields?.title as string || 'Untitled Epic'
    const description = record.fields?.description as string || ''
    const state = toEpicApiStatus((record.fields?.status as string) || 'backlog')

    const res = await fetch('/api/epics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo,
        action: 'create',
        data: { title, description, state }
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create epic')

    setRefreshKey(k => k + 1)

    return {
      id: data.epic.id,
      fields: {
        title: data.epic.title,
        description: data.epic.description,
        status: toEpicUiStatus(data.epic.state),
        createdAt: data.epic.createdAt
      },
      createdAt: data.epic.createdAt
    }
  }, [repo])

  const updateRecord = useCallback(async (id: string, record: Partial<IRecord>): Promise<IRecord> => {
    const epic = epics.find(e => e.id === id)
    if (!epic) throw new Error('Epic not found')

    const newState = record.fields?.status as string
    const fromState = epic.state

    const toState = newState ? toEpicApiStatus(newState) : ''

    if (toState && toState !== fromState) {
      const res = await fetch('/api/epics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          action: 'move',
          epicId: id,
          fromState,
          toState
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to move epic')
      }
    }

    setRefreshKey(k => k + 1)

    return {
      id,
      fields: record.fields ? { ...record.fields, status: newState ? toEpicUiStatus(toState) : record.fields.status } : {},
      createdAt: epic.createdAt
    }
  }, [repo, epics])

  const deleteRecord = useCallback(async (_id: string): Promise<void> => {
    // Implement if needed
  }, [])

  const dbClient: IDataViewsClient = {
    getRecords: async () => {
      const records = epics.map(epic => {
        return {
          id: epic.id,
          fields: {
            title: epic.title,
            description: `${epic.description}\n\nStatus: ${epic.state}`,
            status: toEpicUiStatus(epic.state),
            createdAt: epic.createdAt
          },
          createdAt: epic.createdAt
        }
      })
      return records
    },
    createRecord,
    updateRecord,
    deleteRecord
  }

  return (
    <div className="h-full dataviews-hide-header">
      <DataViews
        schema={epicSchema}
        dbClient={dbClient}
        config={{
          defaultView: 'kanban',
          language: 'en'
        }}
        key={refreshKey}
        onRecordClick={(record: IRecord) => {
          const epic = epics.find((e) => e.id === record.id)
          if (epic) onEpicSelect(epic)
        }}
      />
    </div>
  )
}
