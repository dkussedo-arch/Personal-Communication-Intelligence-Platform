import { writeFileSync } from "node:fs";
import path from "node:path";

import { SUMMARY_JSON_SCHEMA } from "../lib/prompt-config";
import { loadJsonAnalyticalPrompt } from "../lib/load-prompt";

async function main() {
  const systemPrompt = await loadJsonAnalyticalPrompt(
    "summary.txt",
    SUMMARY_JSON_SCHEMA
  );

  const systemOutputPath = path.join(
    process.cwd(),
    "prompts",
    "evaluation",
    "summary-eval-system.txt"
  );
  const promptOutputPath = path.join(
    process.cwd(),
    "prompts",
    "evaluation",
    "summary-eval-prompt.txt"
  );

  const evalPrompt = `${systemPrompt}

Document to summarize:

{{input}}

Remember: return only the JSON object. No markdown, no explanation, no code fences.
`;

  writeFileSync(systemOutputPath, systemPrompt, "utf-8");
  writeFileSync(promptOutputPath, evalPrompt, "utf-8");
  console.log(`Wrote ${systemOutputPath}`);
  console.log(`Wrote ${promptOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
