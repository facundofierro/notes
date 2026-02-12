export interface ToolSettings {
  defaultPermissions: boolean;
  defaultModel: string;
  cliParameters: string;
  workflowOverrides: Record<string, Partial<Omit<ToolSettings, "workflowOverrides">>>;
}

export type AgentToolSettings = Record<string, ToolSettings>;

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  defaultPermissions: false,
  defaultModel: "",
  cliParameters: "",
  workflowOverrides: {},
};
