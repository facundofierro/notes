import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

export async function main() {
  const stagehand = new Stagehand({
    env: "LOCAL",
  });

  await stagehand.init();
  const page = stagehand.page;
  await page.goto("https://example.com");

  const title = await page.extract({
    instruction: "get the title of the page",
    schema: z.object({ title: z.string() })
  });

  console.log("Page title:", title);
  await stagehand.close();
}

if (require.main === module) {
  main().catch(console.error);
}
