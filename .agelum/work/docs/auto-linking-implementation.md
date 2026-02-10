# Auto-Linking Plans and Tests to Tasks

## Problem Statement

When creating plans or tests from the AI sidebar, the generated files were not being automatically linked in the task file's frontmatter. This required manual updates and created inconsistency.

## Solution Overview

Implemented a **programmatic, deterministic system** for linking plans and tests to tasks that:

1. ✅ Generates unique, timestamp-based filenames to prevent overwrites
2. ✅ Automatically updates task frontmatter via API (not relying on LLM)
3. ✅ Ensures the LLM creates files at exactly the path we link
4. ✅ Works consistently for both plans and tests

## Implementation Details

### 1. API Endpoint for Frontmatter Updates

**File:** `apps/web/src/app/api/(content)/tasks/link/route.ts`

This endpoint programmatically updates task frontmatter with plan/test links:

- Reads the task file
- Parses or creates YAML frontmatter
- Adds/updates `plan:` and/or `tests:` fields
- Writes back the updated content

**Usage:**

```typescript
POST /api/tasks/link
{
  "taskPath": "/absolute/path/to/task.md",
  "planPath": ".agelum/work/plans/my-task-1739199681234.md"
}
```

### 2. Timestamp-Based Plan IDs

**Files:**

- `apps/web/src/hooks/usePromptBuilder.ts`
- `apps/web/src/components/layout/AIRightSidebar.tsx`

**How it works:**

1. When user clicks "Plan" mode agent, we **pre-generate** a unique plan path:

   ```typescript
   const timestamp = Date.now();
   const planPath = `.agelum/work/plans/${taskFileName}-${timestamp}.md`;
   ```

2. This path is stored in state and passed to the prompt builder

3. The LLM is instructed to create the plan at **exactly this path**

4. After the agent completes, we call the API to link this **same path** in frontmatter

### 3. Prompt Changes

**File:** `apps/web/src/hooks/usePromptBuilder.ts`

**Before:**

```typescript
"4. CRITICAL: Update the task file frontmatter...";
// (Many instructions for LLM to manually update YAML)
```

**After:**

```typescript
`3. Create a detailed plan document at "${planPath}".`;
("NOTE: The task file will be automatically updated with a link to this plan.");
```

The LLM no longer needs to understand or manipulate YAML frontmatter!

### 4. Post-Processing Logic

**File:** `apps/web/src/components/layout/AIRightSidebar.tsx`

After the agent finishes execution (in the `finally` block):

```typescript
if (docAiMode === "plan" && file?.path && lastGeneratedPlanPath) {
  // Call API to update frontmatter
  fetch("/api/tasks/link", {
    method: "POST",
    body: JSON.stringify({
      taskPath: file.path,
      planPath: lastGeneratedPlanPath,
    }),
  }).then(() => {
    refreshCurrentFile(); // Show updated frontmatter
  });
}
```

### 5. Frontend Detection

**Files:**

- `apps/web/src/components/features/work/WorkEditor.tsx`
- `apps/web/src/components/features/work/TaskTests.tsx`

The UI now:

- Extracts `plan:` from frontmatter → Shows "Plan" tab with content
- Extracts `tests:` from frontmatter → Shows "Tests" tab with linked tests
- Shows helpful empty states when no plan/tests are linked

## File Naming Convention

### Plans

- **Location:** `.agelum/work/plans/`
- **Format:** `{taskname}-{timestamp}.md`
- **Example:** `auto-save-summary-1739199681234.md`

### Tests (Future)

- **Location:** `.agelum/work/tests/`
- **Format:** `{taskname}-{timestamp}.json`
- **Example:** `auto-save-summary-1739199681234.json`

## Frontmatter Format

```yaml
---
title: My Task
plan: .agelum/work/plans/my-task-1739199681234.md
tests: .agelum/work/tests/my-task-1739199681234.json
---
# Task content here...
```

## Benefits

1. **Deterministic:** Same logic always produces same results
2. **No Overwrites:** Timestamp ensures unique filenames
3. **LLM-Independent:** Frontmatter updates don't rely on LLM following instructions
4. **Maintainable:** All linking logic in one API endpoint
5. **Extensible:** Same pattern works for tests, docs, or any future linked resources

## Testing the Implementation

1. Open a task in the kanban board
2. Click "Plan" mode in the AI sidebar
3. Type a prompt and run an agent
4. After completion:
   - ✅ Plan file created with timestamp in name
   - ✅ Task frontmatter automatically updated with `plan:` field
   - ✅ "Plan" tab now shows the linked plan
   - ✅ Can switch between Task/Plan/Tests tabs

## Future Enhancements

The same pattern can be applied to:

- Automatically linking tests when created
- Linking documentation references
- Linking related epics or dependencies
- Version history of plans
