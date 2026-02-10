import * as React from "react";
import { Plus, Play, CheckCircle, XCircle, Clock } from "lucide-react";

interface TaskTestsProps {
  taskPath: string;
  repo: string | null;
}

interface TestItem {
  id: string;
  name: string;
  status: "pending" | "passed" | "failed";
  lastRun?: string;
  path?: string;
}

export function TaskTests({ taskPath, repo }: TaskTestsProps) {
  const [tests, setTests] = React.useState<TestItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  // In a real implementation, we would fetch the linked tests JSON or derive it.
  // For now, we'll mock or show empty state.
  
  return (
    <div className="flex flex-col h-full bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-foreground">Task Verified Tests</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Test
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border border-dashed border-border rounded-lg bg-secondary/10">
            <p>No tests linked to this task.</p>
            <p className="text-xs mt-2">Create a new test or link existing ones.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tests.map(test => (
              <div key={test.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  {test.status === "passed" ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                   test.status === "failed" ? <XCircle className="w-5 h-5 text-red-500" /> :
                   <Clock className="w-5 h-5 text-yellow-500" />}
                  <div>
                    <div className="text-sm font-medium text-foreground">{test.name}</div>
                    {test.lastRun && <div className="text-xs text-muted-foreground">Last run: {test.lastRun}</div>}
                  </div>
                </div>
                <button className="p-2 text-muted-foreground hover:text-white rounded-md hover:bg-background">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
