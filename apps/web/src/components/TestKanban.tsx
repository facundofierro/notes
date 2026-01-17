'use client'

import { DataViews, type IDataViewsClient, type TableSchema } from 'kanban'

const testSchema: TableSchema = {
  id: 'test',
  name: 'Test',
  fields: [
    { id: 'title', name: 'Title', type: 'text', isPrimary: true },
    { id: 'status', name: 'Status', type: 'select', options: [
      { id: 'todo', name: 'To Do', color: 'yellow' },
      { id: 'doing', name: 'Doing', color: 'blue' },
      { id: 'done', name: 'Done', color: 'green' }
    ]}
  ]
}

const testData = [
  {
    id: '1',
    fields: {
      title: 'Test Task 1',
      status: 'To Do'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    fields: {
      title: 'Test Task 2',
      status: 'Doing'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    fields: {
      title: 'Test Task 3',
      status: 'Done'
    },
    createdAt: new Date().toISOString()
  }
]

export default function TestKanban() {
  const dbClient: IDataViewsClient = {
    getRecords: async () => {
      console.log('Test data:', JSON.stringify(testData, null, 2))
      return testData
    },
    createRecord: async () => testData[0],
    updateRecord: async () => testData[0],
    deleteRecord: async () => {}
  }

  return (
    <div className="h-full">
      <DataViews
        schema={testSchema}
        dbClient={dbClient}
        config={{
          defaultView: 'kanban',
          language: 'en'
        }}
      />
    </div>
  )
}
