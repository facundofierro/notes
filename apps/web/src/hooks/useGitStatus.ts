"use client";

import { useEffect, useCallback } from "react";
import { useHomeStore } from "@/store/useHomeStore";

export function useGitStatusPoller() {
  const selectedRepo = useHomeStore((s) => s.selectedRepo);
  const setProjectState = useHomeStore((s) => s.setProjectState);

  const fetchStatus = useCallback(
    async (doGitFetch = false) => {
      // Get fresh state manually to avoid dependency loops/re-renders
      const state = useHomeStore.getState();
      const currentRepo = state.selectedRepo;
      if (!currentRepo) return;

      try {
        // 1. Optional heavy git fetch (every 10m)
        if (doGitFetch) {
          const repo = state.repositories.find((r) => r.name === currentRepo);
          if (repo?.path) {
            await fetch("/api/git", {
              method: "POST",
              body: JSON.stringify({ action: "fetch", repoPath: repo.path }),
            });
          }
        }

        // 2. Quick status check (includes local changes + ahead/behind based on last fetch)
        const res = await fetch(
          `/api/app-status?repo=${encodeURIComponent(currentRepo)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setProjectState(() => ({
            isAppRunning: data.isRunning,
            isAppManaged: data.isManaged,
            appPid: data.pid || null,
            gitStatus: data.gitStatus
              ? { ...data.gitStatus, lastPolledAt: Date.now() }
              : null,
          }));
        }
      } catch (e) {
        console.error("Failed to fetch git status for poller", e);
      }
    },
    [setProjectState],
  );

  useEffect(() => {
    if (!selectedRepo) return;

    // Initial check
    fetchStatus();

    // Fast polling: Local changes every 10s
    const fastInterval = setInterval(() => {
      fetchStatus(false);
    }, 10000);

    // Slow polling: Remote changes (git fetch) every 10m
    const slowInterval = setInterval(() => {
      fetchStatus(true);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
    };
  }, [selectedRepo, fetchStatus]);

  return { refresh: () => fetchStatus(true) };
}
