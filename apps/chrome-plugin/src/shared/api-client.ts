import { ConnectionSettings } from "./storage";

export interface CreateReportRequest {
  repo: string;
  title: string;
  description: string;
  screenshotDataUrl: string;
  state: string;
  sourceUrl: string;
}

export async function createReport(settings: ConnectionSettings, report: CreateReportRequest) {
  const url = `${settings.serverUrl}/api/v1/reports`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create report: ${error}`);
  }

  return response.json();
}
