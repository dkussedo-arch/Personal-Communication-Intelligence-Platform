const CONFIDENCE_RANK = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

function fail(reason) {
  return { pass: false, score: 0, reason };
}

function pass() {
  return {
    pass: true,
    score: 1,
    reason: "Summary output matches expected criteria.",
  };
}

function includesAll(haystack, needles) {
  const normalized = String(haystack ?? "").toLowerCase();
  return needles.every((needle) =>
    normalized.includes(String(needle).toLowerCase())
  );
}

function includesAny(haystack, needles) {
  const normalized = String(haystack ?? "").toLowerCase();
  return needles.some((needle) =>
    normalized.includes(String(needle).toLowerCase())
  );
}

function outputText(parsed) {
  return [
    parsed.summary,
    ...(Array.isArray(parsed.key_points) ? parsed.key_points : []),
    ...(Array.isArray(parsed.action_items) ? parsed.action_items : []),
    ...(Array.isArray(parsed.flags) ? parsed.flags : []),
  ].join(" ");
}

function validateSchema(parsed) {
  if (typeof parsed.summary !== "string") {
    return "Expected summary to be a string.";
  }
  if (!Array.isArray(parsed.key_points)) {
    return "Expected key_points to be an array.";
  }
  if (!parsed.key_points.every((item) => typeof item === "string")) {
    return "Expected every key_points item to be a string.";
  }
  if (!Array.isArray(parsed.action_items)) {
    return "Expected action_items to be an array.";
  }
  if (!parsed.action_items.every((item) => typeof item === "string")) {
    return "Expected every action_items item to be a string.";
  }
  if (!["HIGH", "MEDIUM", "LOW"].includes(parsed.confidence)) {
    return "Expected confidence to be HIGH, MEDIUM, or LOW.";
  }
  if (!Array.isArray(parsed.flags)) {
    return "Expected flags to be an array.";
  }
  if (!parsed.flags.every((item) => typeof item === "string")) {
    return "Expected every flags item to be a string.";
  }
  return null;
}

function assertConfidence(parsed, expected) {
  const actualRank = CONFIDENCE_RANK[parsed.confidence];

  if (expected.confidence && parsed.confidence !== expected.confidence) {
    return `Expected confidence ${expected.confidence}, got ${parsed.confidence}.`;
  }

  if (
    expected.confidence_min &&
    actualRank < CONFIDENCE_RANK[expected.confidence_min]
  ) {
    return `Expected confidence at least ${expected.confidence_min}, got ${parsed.confidence}.`;
  }

  if (
    expected.confidence_max &&
    actualRank > CONFIDENCE_RANK[expected.confidence_max]
  ) {
    return `Expected confidence at most ${expected.confidence_max}, got ${parsed.confidence}.`;
  }

  return null;
}

function assertNotFoundSignal(parsed) {
  const flagsText = parsed.flags.join(" ");
  const allText = outputText(parsed);

  const hasSignal =
    parsed.confidence === "LOW" ||
    includesAny(flagsText, [
      "not found",
      "no financial",
      "missing",
      "absent",
      "not mention",
      "not present",
      "insufficient",
    ]) ||
    includesAny(allText, ["cannot find this information"]);

  return hasSignal
    ? null
    : "Expected a not-found signal (LOW confidence or a relevant flag), but none was detected.";
}

function assertOutOfScope(parsed) {
  const allText = outputText(parsed);
  const hasSignal =
    parsed.confidence === "LOW" ||
    includesAny(allText, [
      "out of scope",
      "outside the scope",
      "not within",
      "professional communication intelligence",
      "cannot",
    ]);

  if (!hasSignal) {
    return "Expected an out-of-scope signal, but none was detected.";
  }

  if (includesAny(allText, ["beautifulsoup", "selenium"])) {
    return "Output appears to answer the off-topic request instead of flagging it.";
  }

  return null;
}

function assertContradiction(parsed) {
  const allText = outputText(parsed);
  const hasSignal = includesAny(allText, [
    "contradict",
    "conflict",
    "inconsistent",
    "updated note",
    "position shift",
    "initial",
  ]);

  return hasSignal
    ? null
    : "Expected the output to acknowledge contradictory or updated statements.";
}

function assertNoInventedNumbers(parsed, input) {
  const allText = outputText(parsed);
  const allowedNumbers = new Set(
    String(input)
      .match(/\$?\b\d+(?:\.\d+)?%?\b|\bQ[1-4]\b/gi)
      ?.map((item) => item.toLowerCase()) ?? []
  );
  const outputNumbers =
    allText.match(/\$?\b\d+(?:\.\d+)?%?\b|\bQ[1-4]\b/gi) ?? [];

  const invented = outputNumbers.filter(
    (item) => !allowedNumbers.has(item.toLowerCase())
  );

  return invented.length === 0
    ? null
    : `Output appears to invent number(s): ${invented.join(", ")}.`;
}

/**
 * Promptfoo custom assertions for PCI summary JSON output.
 * @param {string} output - Raw model output
 * @param {import('promptfoo').AssertionValueFunctionContext} context
 */
module.exports = (output, context) => {
  const contextInput = String(context.vars?.input ?? "");

  if (output.includes("```")) {
    return fail("Output contains markdown code fences, which the app forbids.");
  }

  let parsed;

  try {
    parsed = JSON.parse(output.trim());
  } catch {
    return fail("Output is not valid JSON.");
  }

  const expected = context.vars?.expected ?? {};

  if (parsed.error) {
    return expected.should_flag_out_of_scope
      ? pass()
      : fail(`Model returned error: ${parsed.error}`);
  }

  const schemaError = validateSchema(parsed);
  if (schemaError) {
    return fail(schemaError);
  }

  if (
    expected.summary_contains &&
    !includesAll(parsed.summary, expected.summary_contains)
  ) {
    return fail(
      `Summary does not contain all expected terms: ${expected.summary_contains.join(
        ", "
      )}. Got: ${parsed.summary}`
    );
  }

  if (
    expected.summary_must_not_contain &&
    includesAny(parsed.summary, expected.summary_must_not_contain)
  ) {
    return fail(
      `Summary contains forbidden term(s): ${expected.summary_must_not_contain.join(
        ", "
      )}. Got: ${parsed.summary}`
    );
  }

  if (typeof expected.key_points_min === "number") {
    if (parsed.key_points.length < expected.key_points_min) {
      return fail(
        `Expected at least ${expected.key_points_min} key point(s), got ${parsed.key_points.length}.`
      );
    }
  }

  if (typeof expected.action_items_min === "number") {
    if (parsed.action_items.length < expected.action_items_min) {
      return fail(
        `Expected at least ${expected.action_items_min} action item(s), got ${parsed.action_items.length}.`
      );
    }
  }

  if (typeof expected.action_items_max === "number") {
    if (parsed.action_items.length > expected.action_items_max) {
      return fail(
        `Expected at most ${expected.action_items_max} action item(s), got ${parsed.action_items.length}.`
      );
    }
  }

  if (typeof expected.flags_min === "number") {
    if (parsed.flags.length < expected.flags_min) {
      return fail(
        `Expected at least ${expected.flags_min} flag(s), got ${parsed.flags.length}.`
      );
    }
  }

  const confidenceError = assertConfidence(parsed, expected);
  if (confidenceError) {
    return fail(confidenceError);
  }

  if (expected.should_flag_not_found) {
    const error = assertNotFoundSignal(parsed);
    if (error) {
      return fail(error);
    }
  }

  if (expected.should_flag_out_of_scope) {
    const error = assertOutOfScope(parsed);
    if (error) {
      return fail(error);
    }
  }

  if (expected.must_acknowledge_contradiction) {
    const error = assertContradiction(parsed);
    if (error) {
      return fail(error);
    }
  }

  if (expected.must_not_invent_numbers) {
    const error = assertNoInventedNumbers(parsed, contextInput);
    if (error) {
      return fail(error);
    }
  }

  if (expected.must_not_invent) {
    const allText = outputText(parsed);
    if (includesAny(allText, expected.must_not_invent)) {
      return fail(
        `Output contains forbidden invented term(s): ${expected.must_not_invent.join(
          ", "
        )}.`
      );
    }
  }

  return pass();
};
