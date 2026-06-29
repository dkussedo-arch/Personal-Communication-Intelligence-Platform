# Prompt evaluation (Promptfoo)

Evaluates `prompts/summary.txt` against the 10-case suite in `evals/test-cases.json`.

## Prerequisites

- `ANTHROPIC_API_KEY` in `.env.local`
- Dependencies installed: `npm install`

## Run evals

```bash
npm run eval
```

This will:

1. Assemble the system prompt from `lib/prompt-config.ts` + `prompts/summary.txt` into `summary-eval-system.txt`
2. Run all 10 test cases against `claude-sonnet-4-6` at temperature `0.2`
3. Write results to `.promptfoo/summary-results.json`

## View dashboard

```bash
npm run eval:view
```

## Prompt experiment workflow

```bash
git checkout -b prompt/improve-summary-accuracy
# Edit prompts/summary.txt
# Test in Anthropic Workbench first
npm run eval
git checkout main
git merge prompt/improve-summary-accuracy
```

## Test cases

| ID | Description | Checks |
|----|-------------|--------|
| tc-001 | Golden path | Summary contains revenue/Q4/40%, at least 2 action items |
| tc-002 | Incomplete board memo | No invented numbers, confidence no higher than MEDIUM, at least 1 flag |
| tc-003 | Off-topic request | LOW confidence or out-of-scope signal; no off-topic answer |
| tc-004 | Hallucination bait | No invented numbers or forbidden summary terms |
| tc-005 | Long formatted deck | Captures metrics, at least 3 key points, at least 3 action items |
| tc-006 | Investor email | Captures earnings call timing and action item |
| tc-007 | Contradictory statements | Acknowledges conflict or updated note |
| tc-008 | Minimal fragment | LOW confidence, no action items, at least 1 flag |
| tc-009 | No financial data | Flags missing financials and avoids invented numbers |
| tc-010 | Regulated disclosure | Avoids invented deal terms and keeps confidence at least MEDIUM |

Edit `../../evals/test-cases.json` to add cases. Each test uses Promptfoo's `vars` format:

```json
{
  "description": "Readable case name",
  "vars": {
    "id": "tc-011",
    "edge_case": "Failure mode covered",
    "input": "User document text",
    "perfect_output": "Human-readable rubric",
    "expected": {
      "summary_contains": ["required terms"],
      "flags_min": 1
    }
  }
}
```
