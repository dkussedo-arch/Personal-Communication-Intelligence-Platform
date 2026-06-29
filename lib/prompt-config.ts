/**
 * Temperature guidance for PCI prompts:
 * - analytical (0.1–0.3): document analysis, claim evaluation, grounded summaries
 * - creative (0.6–0.8): draft generation, conversational refinement
 */
export const PROMPT_TEMPERATURE = {
  analytical: 0.2,
  creative: 0.7,
} as const;

export const CRITICAL_ACCURACY_RULES = `CRITICAL RULES — you must follow these without exception:
- Answer ONLY from the provided context. Do NOT use general knowledge.
- If the answer is not clearly in the context, say exactly:
  'I cannot find this information in the provided document.'
- Do NOT make up statistics, names, dates, figures, or citations.
- If you are uncertain, use phrases like 'the document suggests' or
  'this appears to indicate' rather than stating it as fact.
- Never answer questions outside the scope of professional communication intelligence and the provided documents or source context.

`;

export const CHAIN_OF_THOUGHT_PREFIX = `Before giving your final answer, reason through the problem step by step:
STEP 1: What exactly is the user asking for?
STEP 2: What information in the provided context is directly relevant?
STEP 3: What is the most accurate answer based only on the provided context?
STEP 4: Is there anything I am uncertain about? If so, flag it explicitly. Then provide your final answer in the required output format.

`;

export const INTERNAL_REASONING_PREFIX = `Before producing the JSON, reason through the task internally:
STEP 1: What exactly is the user asking for?
STEP 2: What information in the provided context is directly relevant?
STEP 3: What is the most accurate answer based only on the provided context?
STEP 4: Is there anything uncertain? Reflect uncertainty in confidence and flags.

Do not output these steps. Output only the required JSON object.

`;

export const JSON_OUTPUT_RULES = `Return ONLY valid JSON. No prose before or after. No markdown code fences (no \`\`\`).
If you cannot generate a response, return: { "error": "reason here" }

Validate your JSON mentally before responding. One invalid character breaks the app.

`;

export const SUMMARY_JSON_SCHEMA = `{
  "summary": "string (2-3 sentences max)",
  "key_points": ["string", "string", "string"],
  "action_items": ["string array"],
  "confidence": "HIGH | MEDIUM | LOW",
  "flags": ["any concerns or warnings"]
}`;

export const EVALUATE_JSON_SCHEMA = `{
  "claims": [
    {
      "id": "claim-1",
      "claim": "The exact claim being evaluated.",
      "status": "SUPPORTED | IMPLIED | NOT_FOUND | CONTRADICTED",
      "explanation": "A concise reason for the status.",
      "evidence": [
        {
          "source": "Optional source label or filename",
          "quote": "A short quote from the provided context"
        }
      ]
    }
  ]
}`;

export function buildJsonOutputInstructions(schema: string): string {
  return `${JSON_OUTPUT_RULES}Required JSON schema:
${schema}
`;
}
