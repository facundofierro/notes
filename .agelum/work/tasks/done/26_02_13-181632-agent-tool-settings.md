---
created: 2026-02-12T13:58:15.422Z
state: pending
plan: .agelum/work/plans/agent-tool-settings-1770906630387.md
summary: .agelum/work/summaries/agent-tool-settings-1770908244508.md
---

# agent-tool-settings

Modify the AI Agent Tools list in `AIRightSidebar`:
- **Tool List Item UI Improvements:**
    - Replace the "Run" text in the second line (it's irrelevant).
    - Instead, show an icon representing the tool type (e.g., Web, Terminal, IDE) along with the type name.
    - Move the tool type icon from the top right.
- **Tool Settings:**
    - Add a settings icon at the top right of each tool card.
    - Clicking the settings icon should open a dialog for configuring that specific tool.
    - **Dialog Structure:**
        - Create a dedicated folder for tool setting interfaces.
        - The view in the dialog should adapt based on the tool.
        - Use tabs to separate "General" configuration from "Workflow-specific" configurations (e.g., Plan, Start, Modify).
    - **Configuration Options:**
        - Default permissions.
        - Default LLM.
        - CLI tool parameters.
        - Workflow-specific overrides for general settings.
