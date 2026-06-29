import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

const root = process.cwd();
const envLocalPath = path.join(root, ".env.local");
const envPath = path.join(root, ".env");

function loadEnvFiles() {
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return;
  }

  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath });
    return;
  }

  if (existsSync(envPath)) {
    config({ path: envPath });
    return;
  }

  console.error(
    [
      "ANTHROPIC_API_KEY is not set.",
      "",
      "Create .env.local in the project root:",
      `  ${envLocalPath}`,
      "",
      "With:",
      "  ANTHROPIC_API_KEY=sk-ant-...",
      "",
      "Or set it in your shell before running eval:",
      '  $env:ANTHROPIC_API_KEY="sk-ant-..."   # PowerShell',
      '  export ANTHROPIC_API_KEY=sk-ant-...  # bash',
    ].join("\n")
  );
  process.exit(1);
}

loadEnvFiles();

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error(
    "ANTHROPIC_API_KEY is missing or empty. Add it to .env.local and try again."
  );
  process.exit(1);
}

const result = spawnSync(
  "promptfoo",
  [
    "eval",
    "-c",
    "prompts/evaluation/promptfooconfig.yaml",
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }
);

process.exit(result.status ?? 1);
