"use client";

import { useState, useEffect } from "react";
import { Button } from "@agelum/shadcn/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agelum/shadcn/table";
import { ScrollArea } from "@agelum/shadcn/scroll-area";
import { Trash2, Play, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
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
    const name = prompt("Enter test name:");
    if (!name) return;
    
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        fetchTests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runTest = async (id: string) => {
    setRunning(id);
    try {
      const res = await fetch("/api/tests/execute", {
        method: "POST",
        body: JSON.stringify({ id }),
        headers: { "Content-Type": "application/json" }
      });
      
      const reader = res.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        console.log(text); // For now log to console, later show in UI
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Browser Tests</h1>
        <Button onClick={createTest}>
          <Plus className="w-4 h-4 mr-2" />
          New Test
        </Button>
      </div>

      <ScrollArea className="flex-1 border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                </TableRow>
            ) : tests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No tests found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">
                    <Link href={`/tests/${test.id}`} className="hover:underline">
                        {test.name}
                    </Link>
                  </TableCell>
                  <TableCell>{test.stepsCount}</TableCell>
                  <TableCell>{test.updatedAt ? new Date(test.updatedAt).toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => runTest(test.id)}
                        disabled={running === test.id}
                    >
                      {running === test.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
