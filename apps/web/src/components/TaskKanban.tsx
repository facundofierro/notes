'use client'

import { useState, useEffect, useCallback } from 'react'
import { DataViews, tableSchema, type IRecord, type IDataViewsClient, type TableSchema } from 'shadcn-data-views'

interface Task {
  id: string
  title: string
  description: string
  state: 'pending' | 'doing' | 'done'
  createdAt: string
}

const taskSchema: TableSchema = {
  id: 'tasks',
  name: 'Tasks',
  fields: [
    { id: 'title', name: 'Title', type: 'text', isPrimary: true },
    { id: 'description', name: 'Description', type: 'text' },
    { id: 'state', name: 'Status', type: 'select', options: [
      { id: 'pending', name: 'Pending', color: 'yellow' },
      { id: 'doing', name: 'Doing', color: 'blue' },
      { id: 'done', name: 'Done', color: 'green' }
    ]},
    { id: 'createdAt', name: 'Created', type: 'date' }
  ]
}

interface TaskKanbanProps {
  repo: string
  onTaskSelect: (task: Task) => void
}

export default function TaskKanban({ repo, onTaskSelect }: TaskKanbanProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?repo=${encodeURIComponent(repo)}`)
    const data = await res.json()
    setTasks(data.tasks || [])
  }, [repo])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks, refreshKey])

  const createRecord = useCallback(async (record: Partial<IRecord>): Promise<IRecord> => {
    const title = record.fields?.title as string || 'Untitled Task'
    const description = record.fields?.description as string || ''
    const state = (record.fields?.state as string) || 'pending'

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo,
        action: 'create',
        data: { title, description, state }
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create task')

    setRefreshKey(k => k + 1)

    return {
      id: data.task.id,
      fields: {
        title: data.task.title,
        description: data.task.description,
        state: data.task.state,
        createdAt: data.task.createdAt
      },
      createdAt: data.task.createdAt
    }
  }, [repo])

  const updateRecord = useCallback(async (id: string, record: Partial<IRecord>): Promise<IRecord> => {
    const task = tasks.find(t => t.id === id)
    if (!task) throw new Error('Task not found')

    const newState = record.fields?.state as string
    const fromState = task.state

    if (newState && newState !== fromState) {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          action: 'move',
          taskId: id,
          fromState,
          toState: newState
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to move task')
      }
    }

    setRefreshKey(k => k + 1)

    return {
      id,
      fields: record.fields || {},
      createdAt: task.createdAt
    }
  }, [repo, tasks])

  const deleteRecord = useCallback(async (_id: string): Promise<void> => {
    // Implement if needed
  }, [])

  const dbClient: IDataViewsClient = {
    getRecords: async () => {
      return tasks.map(task => ({
        id: task.id,
        fields: {
          title: task.title,
          description: task.description,
          state: task.state,
          createdAt: task.createdAt
        },
        createdAt: task.createdAt
      }))
    },
    createRecord,
    updateRecord,
    deleteRecord
  }

  return (
    <div className="h-full dataviews-hide-header">
      <DataViews
        schema={taskSchema}
        dbClient={dbClient}
        config={{
          defaultView: 'kanban',
          language: 'en'
        }}
      />
    </div>
  )
}
