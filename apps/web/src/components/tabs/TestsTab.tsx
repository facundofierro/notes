"use client";

import * as React from "react";
import { 
  Button,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  ScrollArea,
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@agelum/shadcn";
import { Trash2, Play, Plus, Loader2, FileJson, TerminalSquare, Pencil, ChevronRight } from "lucide-react";
import { TestEditor } from "./tests/TestEditor";

interface TestScenario {
  id: string;
  name: string;
  stepsCount: number;
  updatedAt: string;
}

export function TestsTab() {
  const [tests, setTests] = React.useState<TestScenario[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<Record<string, string>>({});
  const [openLogDialog, setOpenLogDialog] = React.useState<string | null>(null);
  
  // Editor State
  const [selectedTestId, setSelectedTestId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedTestId) {
      fetchTests();
    }
  }, [selectedTestId]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createTest = async () => {
    // Quick create
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        body: JSON.stringify({ name: "Untitled Test", steps: [] }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        // Open editor for new test
        setSelectedTestId(data.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure?")) return;
    
    try {
      await fetch(`/api/tests/${id}`, {
        method: "DELETE"
      });
      fetchTests();
    } catch (e) { console.error(e); }
  };

  const runTest = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (running) return;
    setRunning(id);
    setLogs((prev) => ({ ...prev, [id]: "" }));
    setOpenLogDialog(id); 

    try {
      const res = await fetch("/api/tests/execute", {
        method: "POST",
        body: JSON.stringify({ id }),
        headers: { "Content-Type": "application/json" }
      });
      
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setLogs((prev) => ({
          ...prev,
          [id]: (prev[id] || "") + chunk
        }));
      }
    } catch (e) {
      console.error(e);
      setLogs((prev) => ({
        ...prev,
        [id]: (prev[id] || "") + `\nError: ${e}\n`
      }));
    } finally {
      setRunning(null);
    }
  };

  if (selectedTestId) {
    return (
        <TestEditor 
            testId={selectedTestId} 
            onBack={() => setSelectedTestId(null)} 
        />
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold tracking-tight">Browser Tests</h2>
        <Button onClick={createTest} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Test
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Test Name</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                  <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                  </TableRow>
              ) : tests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                        <FileJson className="w-8 h-8 opacity-50" />
                        <p>No tests found. Create a new test scenario to get started.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tests.map((test) => (
                  <TableRow 
                        key={test.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => setSelectedTestId(test.id)}
                  >
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-primary" />
                            {test.name}
                        </div>
                    </TableCell>
                    <TableCell>{test.stepsCount}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {test.updatedAt ? new Date(test.updatedAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={(e) => { e.stopPropagation(); setOpenLogDialog(test.id); }}
                            title="View Logs"
                        >
                           <TerminalSquare className="w-4 h-4" />
                        </Button>
                        <Button 
                            size="icon"
                            variant="ghost" 
                            onClick={(e) => runTest(test.id, e)}
                            disabled={running === test.id}
                            className={running === test.id ? "text-primary" : ""}
                            title="Run Test"
                        >
                          {running === test.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive" 
                            onClick={(e) => deleteTest(test.id, e)}
                            title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      <Dialog open={!!openLogDialog} onOpenChange={(open) => !open && setOpenLogDialog(null)}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Test Execution Logs</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-black text-green-400 font-mono text-xs p-4 rounded-md overflow-auto whitespace-pre-wrap">
            {openLogDialog && (logs[openLogDialog] || "No logs available.")}
            {openLogDialog && running === openLogDialog && (
                 <span className="animate-pulse">_</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}