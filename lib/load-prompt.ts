import { readFile } from "fs/promises";
import path from "path";

import {
  buildJsonOutputInstructions,
  CHAIN_OF_THOUGHT_PREFIX,
  CRITICAL_ACCURACY_RULES,
  INTERNAL_REASONING_PREFIX,
  PROMPT_TEMPERATURE,
} from "@/lib/prompt-config";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

export async function loadPrompt(filename: string): Promise<string> {
  return readFile(path.join(PROMPTS_DIR, filename), "utf-8");
}

export async function loadAnalyticalPrompt(filename: string): Promise<string> {
  const prompt = await loadPrompt(filename);
  return `${CRITICAL_ACCURACY_RULES}${CHAIN_OF_THOUGHT_PREFIX}${prompt}`;
}

export async function loadJsonAnalyticalPrompt(
  filename: string,
  schema: string
): Promise<string> {
  const prompt = await loadPrompt(filename);
  return `${CRITICAL_ACCURACY_RULES}${INTERNAL_REASONING_PREFIX}${prompt}\n\n${buildJsonOutputInstructions(schema)}`;
}

export { PROMPT_TEMPERATURE };
