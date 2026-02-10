import * as React from "react";
import { Plus, Play, CheckCircle, XCircle, Clock } from "lucide-react";

interface TaskTestsProps {
  taskPath: string;
  repo: string | null;
  testsPath?: string | null;
}

interface TestItem {
  id: string;
  name: string;
  status: "pending" | "passed" | "failed";
  lastRun?: string;
  path?: string;
}

export function TaskTests({ taskPath, repo, testsPath }: TaskTestsProps) {
  const [tests, setTests] = React.useState<TestItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Determine the path for the linked tests JSON file
  // For a task at .agelum/work/tasks/pending/my-task.md, we want .agelum/work/tests/my-task.json
  // We need to resolve this relative to the project root.
  
  React.useEffect(() => {
    if (!taskPath || !repo) return;
    
    const fetchTests = async () => {
      setLoading(true);
      try {
        let testsJsonPath: string;
        
        // If testsPath is provided from frontmatter, use it
        if (testsPath) {
          // testsPath might be relative, so resolve it
          const agelumIndex = taskPath.indexOf("/.agelum/");
          if (agelumIndex !== -1) {
            const baseDir = taskPath.substring(0, agelumIndex);
            testsJsonPath = testsPath.startsWith("/") 
              ? testsPath 
              : `${baseDir}/${testsPath}`;
          } else {
            testsJsonPath = testsPath;
          }
        } else {
          // Fallback: derive from task filename (legacy behavior)
          const fileName = taskPath.split('/').pop();
          if (!fileName) return;
          const taskId = fileName.replace('.md', '');
          
          const agelumIndex = taskPath.indexOf("/.agelum/");
          if (agelumIndex === -1) {
               setTests([]);
               return;
          }
          
          const baseDir = taskPath.substring(0, agelumIndex);
          testsJsonPath = `${baseDir}/.agelum/work/tests/${taskId}.json`;
        }
        
        // 3. Fetch file content
        const res = await fetch(`/api/file?path=${encodeURIComponent(testsJsonPath)}`);
        if (res.ok) {
          const data = await res.json();
          const content = JSON.parse(data.content);
          if (content && Array.isArray(content.tests)) {
            setTests(content.tests);
          }
        } else {
          // File might not exist yet, which is fine
          setTests([]);
        }
      } catch (err) {
        console.error("Failed to fetch task tests:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTests();
  }, [taskPath, repo, testsPath]);

  const handleCreateTest = () => {
      // TODO: Implement dialog to select existing tests or create new
      alert("Feature not implemented: Add Test Dialog");
  };

  return (
    <div className="flex flex-col h-full bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-foreground">Task Verified Tests</h2>
        <button 
            onClick={handleCreateTest}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Test
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
             <div className="flex justify-center items-center h-40 text-muted-foreground">
                 Loading tests...
             </div>
        ) : tests.length === 0 ? (
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
