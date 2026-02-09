"use client";

import * as React from "react";
import { cn, ScrollArea, Button } from "@agelum/shadcn";
import { Play, Plus, FileJson, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { ExecutionHistory } from "./ExecutionHistory";
import { TestStepVisualizer } from "./TestStepVisualizer";
import type { TestScenario, TestExecutionSummary } from "./types";

interface TestsDashboardProps {
  tests: TestScenario[];
  executions: TestExecutionSummary[];
  executionsLoading: boolean;
  loading: boolean;
  onSelectTest: (test: TestScenario) => void;
  onCreateTest: () => void;
  onRunAll: () => void;
  onSelectExecution: (executionId: string, testId: string) => void;
  isRunning: boolean;
}

export function TestsDashboard({
  tests,
  executions,
  executionsLoading,
  loading,
  onSelectTest,
  onCreateTest,
  onRunAll,
  onSelectExecution,
  isRunning,
}: TestsDashboardProps) {
  // Compute stats from recent executions
  const stats = React.useMemo(() => {
    const total = tests.length;
    const recentByTest = new Map<string, TestExecutionSummary>();
    for (const exec of executions) {
      if (!recentByTest.has(exec.testId)) {
        recentByTest.set(exec.testId, exec);
      }
    }
    let passed = 0;
    let failed = 0;
    for (const exec of recentByTest.values()) {
      if (exec.status === "passed") passed++;
      else if (exec.status === "failed" || exec.status === "error") failed++;
    }
    return { total, passed, failed, noRun: total - passed - failed };
  }, [tests, executions]);

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Left: Stats + Test Cards */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Stats Row */}
        <div className="flex items-center gap-3 p-5 border-b border-white/[0.04]">
          <StatCard label="Total Tests" value={stats.total} icon={FileJson} color="text-zinc-300" bg="bg-white/[0.03]" />
          <StatCard label="Passed" value={stats.passed} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard label="Failed" value={stats.failed} icon={XCircle} color="text-red-400" bg="bg-red-500/10" />
        </div>

        {/* Test Cards Grid */}
        <ScrollArea className="flex-1">
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              </div>
            ) : tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-4">
                  <FileJson className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-400 mb-1">No tests yet</p>
                <p className="text-xs text-zinc-600 mb-4">Create a test scenario to start testing.</p>
                <Button
                  onClick={onCreateTest}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-lg h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Test
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {tests.map((test) => {
                  const lastExec = executions.find((e) => e.testId === test.id);
                  return (
                    <TestCard
                      key={test.id}
                      test={test}
                      lastExecution={lastExec}
                      onClick={() => onSelectTest(test)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Run All + Recent Executions */}
      <div className="w-[280px] flex flex-col border-l border-white/[0.04] bg-zinc-950/30">
        <div className="p-4 border-b border-white/[0.04]">
          <Button
            onClick={onRunAll}
            disabled={isRunning || tests.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-xl h-9 text-xs font-medium shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-2" />
            )}
            {isRunning ? "Running..." : "Run All Tests"}
          </Button>
        </div>

        <div className="px-4 pt-3 pb-1">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Recent Executions</h3>
        </div>

        <ExecutionHistory
          executions={executions.slice(0, 20)}
          loading={executionsLoading}
          onSelect={onSelectExecution}
          showTestName
          className="flex-1"
        />
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-white/[0.02] border border-white/[0.04] flex-1 min-w-0">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", bg)}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div className="min-w-0">
        <div className={cn("text-lg font-bold leading-none", color)}>{value}</div>
        <div className="text-[10px] text-zinc-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function TestCard({
  test,
  lastExecution,
  onClick,
}: {
  test: TestScenario;
  lastExecution?: TestExecutionSummary;
  onClick: () => void;
}) {
  const statusColor = lastExecution
    ? lastExecution.status === "passed"
      ? "border-emerald-500/20"
      : lastExecution.status === "failed" || lastExecution.status === "error"
        ? "border-red-500/20"
        : "border-white/[0.04]"
    : "border-white/[0.04]";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 p-4 rounded-[14px] bg-white/[0.02] border text-left",
        "hover:bg-white/[0.05] transition-all duration-300 group",
        "shadow-[0_0_30px_rgba(255,255,255,0.02)]",
        "hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]",
        statusColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileJson className="w-4 h-4 text-emerald-500/70 flex-shrink-0" />
          <span className="text-sm font-medium text-zinc-200 truncate">{test.name}</span>
        </div>
        {lastExecution && (
          <StatusDot status={lastExecution.status} />
        )}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
        <span>{test.stepsCount || 0} steps</span>
        <span className="text-zinc-700">|</span>
        <span>{test.group}</span>
      </div>

      {test.description && (
        <p className="text-[11px] text-zinc-500 line-clamp-2">{test.description}</p>
      )}
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    passed: "bg-emerald-500",
    failed: "bg-red-500",
    error: "bg-amber-500",
    running: "bg-blue-500 animate-pulse",
  };
  return (
    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", colors[status] || "bg-zinc-600")} />
  );
}
