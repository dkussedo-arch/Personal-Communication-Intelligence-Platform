# PCI — AI Approach Analysis
## Personal Communication Intelligence
*Product Strategy Document | June 2026*

---

## Context: The Approach Being Analysed

**Primary Pattern:** Answering Questions About YOUR Documents (RAG + Knowledge Graph)
**Secondary Pattern:** Understanding or Generating Text (LLM generation layer)
**Tertiary Pattern:** Multi-Step Reasoning or Agent Actions (orchestrated pipeline)

The architecture is: User corpus ingested → chunked, embedded, stored in vector DB → Communication Intelligence Graph constructed → on generation request: context retrieval + graph retrieval + prompt assembly → LLM generates draft grounded in retrieved corpus → quality check → delivery with source attribution.

The target user is a senior knowledge professional — C-suite executive, VP, domain expert, or enterprise communications team member — producing 8–30 high-stakes documents per month, for whom AI-generated credibility failures carry real professional consequences.

---

## 1. Three Most Likely Failure Modes

### Failure Mode 1: RAG Retrieval Returns Stale Positions as Current Truth

The retrieval layer has no native understanding of time. When a user has 200 documents spanning five years and asks for a strategy memo on a topic they have written about repeatedly, the retrieval pipeline will return the most *semantically relevant* chunks — not the most *recently held* position. Cosine similarity does not distinguish between a position the user held in 2021 and the contradictory position they moved to in 2024.

For a CSO who has publicly shifted on a market thesis, a research fellow whose published positions have evolved across three papers, or an IR head whose disclosure stance has changed after a material event, PCI will generate from the wrong version of them. The draft will be confidently grounded, fully cited, and wrong in the way that matters most — it will represent who they were, not who they are.

This is the failure mode most likely to cause early churn, because it strikes precisely at the use cases where the user most trusted PCI: "you know my positions."

**Why it is the most likely:** Temporal weighting in RAG is an explicit engineering choice that must be built; it does not come by default from any standard embedding or retrieval implementation. The default pipeline will fail this way unless you deliberately prevent it.

---

### Failure Mode 2: Source Attribution Creates False Trust That Suppresses Critical Review

The source attribution mechanism — showing users which corpus documents each generated claim draws from — is PCI's primary trust signal. 41% of users named it the highest-trust feature. This architecture creates a specific and serious failure mode: the LLM will generate claims that are *adjacent* to retrieved chunks but not strictly contained in them. It will paraphrase, interpolate, and synthesise across multiple chunks. The attribution will still point to real documents the user recognises. The user, seeing a familiar document name attached to a claim, will read critically than they would for an uncited claim.

The danger is not that users trust PCI blindly. The danger is that source attribution shifts the user's default from "I need to verify this" to "this is cited, so I spot-check." For an earnings release, a regulatory filing, or a board-level recommendation where a single wrong claim carries real consequences, that shift in review behaviour is exactly where the credibility incident enters.

This is worse than the failure mode of generic AI tools. When ChatGPT produces a claim with no citation, the user knows to verify. When PCI produces the same claim attributed to their own 2023 strategy memo, they may not.

**Why it is the most likely:** Every RAG system generates beyond its retrieved chunks — that is the nature of LLM inference. Attribution UI will be present from day one because it is a core feature. The combination is structural, not an edge case.

---

### Failure Mode 3: The Communication Intelligence Graph Encodes the Average, Not the Intent

The Knowledge Graph is built from pattern extraction across the corpus. For argument structure, vocabulary, audience calibration, and reasoning patterns, the graph will identify the *modal* patterns — what the user does most often. But expert communication is often defined by deliberate departures from the modal pattern: the time they led with vulnerability instead of authority, the memo where they broke their usual structure to make an emotional case, the paper where they deliberately adopted a more hedged tone for a particular regulatory audience.

A graph that extracts patterns from frequency will encode the average professional and miss the intentional choices. When PCI generates from these patterns, the output will feel slightly flattened — competent but not distinctive. Users will describe it as "mostly right but not quite me." Voice Fidelity Score will plateau at 75–80% and resist improvement because the problem is not in the generation layer — it is in what the graph is encoding.

This is the failure mode that kills word-of-mouth, because the product works well enough that users do not churn immediately, but not well enough that they advocate for it. It creates a ceiling, not a cliff.

**Why it is the most likely:** Frequency-based pattern extraction is the standard approach for communication style modelling. Extracting intentional departures from modal patterns requires a more sophisticated extraction model that distinguishes deliberate choice from random variation — a much harder problem that most MVP implementations will not solve.

---

## 2. Edge Cases That Produce Bad or Harmful Output

**Temporally-sensitive regulatory and legal documents.** The corpus contains a regulatory filing from two years ago. Compliance language, disclosure requirements, and acceptable phrasing have changed since then. PCI retrieves the old filing as the most relevant precedent and generates new language based on it. The draft is fluent, cited, and non-compliant. This is the Reg FD scenario from your user research, operationalised at the system architecture level.

**A user whose public position and private view diverge.** The corpus ingests both published thought leadership (the user's stated position) and internal strategy documents (where they express more complex, hedged, or contradictory views). A generation request for a public-facing document may retrieve internal analysis and synthesise across both, producing output that blurs the line between what the user says publicly and what they actually think. For a policy researcher, an investor, or a board-level executive, this is a credibility and confidentiality failure.

**Deliberate position reversal not yet represented in the corpus.** A user changed their view on a major topic six months ago. They have written one internal email about it. They have 40 documents representing the old view. The retrieval layer returns the 40 documents. The one email is insufficient weight. PCI generates from the abandoned position. The user sends a draft that contradicts their current public stance.

**Multi-author enterprise corpus producing nobody's voice.** A corporate communications team ingests 200 documents written by eight contributors into a shared Communication Intelligence Model. The graph averages across all eight. The output sounds like a committee wrote it — which is what the enterprise communications team was already producing manually. PCI reproduces the problem it was supposed to solve.

**Thin onboarding corpus creating over-fitted generation.** A user uploads 8 documents to get the preview draft experience. Six of them are board presentations. PCI generates a research synthesis in board presentation style — structured like a deck, using bullet-heavy reasoning, written for executive brevity — because that is all the graph knows about this user. Every document type gets the same treatment until the corpus diversifies.

**A generation request that conflicts with the corpus.** User asks for "a strong bullish case for entering the Southeast Asian market." Their corpus contains five years of cautious, risk-weighted analysis of that exact market. RAG retrieval faithfully returns the cautious analysis. The LLM either ignores the brief to stay faithful to the corpus, or ignores the corpus to fulfil the brief. Neither output is what the user needed. The system has no mechanism to flag or resolve this tension.

**Sensitive internal content ingested without distinction from public content.** The user connects their full Google Drive. It contains: published articles (meant to represent their public voice), internal drafts (exploratory, not their final position), confidential client communications (should never be cited), and personal notes (irrelevant). The corpus treats all of these as equivalent sources of intelligence. A generated draft cites a confidential client communication in its source attribution. The user forwards the draft without reviewing the citations.

---

## 3. What You Need to Add to Make This Production-Safe

**Temporal recency weighting in the retrieval layer.** Implement time-decay weighting in your vector similarity scoring so that documents from the last 12 months score higher than semantically similar documents from 3–5 years ago. Expose this to the user: "This draft draws primarily from your 2022–2023 writing on this topic. No recent documents found. Proceed?" This is a retrieval engineering decision that must be made explicitly — the default embedding pipeline will not do this.

**Document classification and access tiers at ingestion.** Before any document enters the corpus, classify it along two dimensions: public vs. private (can it be cited in output?) and current vs. historical (does it represent current position or past position?). Build a simple tagging UI into onboarding. Without this, every document in the corpus has equal citation rights, which creates both the confidentiality failure and the stale-position failure simultaneously.

**Claim-level groundedness scoring with hard review gates.** The confidence heat map described in your brief is necessary but not sufficient. You need a groundedness score per generated claim that measures how closely the claim is supported by the retrieved chunks — not just whether a chunk was retrieved. Claims below a threshold (start at 0.7) should not appear in the draft as written text. They should appear as flagged placeholders: "[PCI could not ground this claim in your corpus — provide source or remove]." Soft visual indicators will not change review behaviour for your target users. Hard gates will.

**Position conflict detection before generation.** Before assembling the generation prompt, run a lightweight comparison between the brief and the corpus evidence on the topic. If early corpus documents take one position and late corpus documents take a different or contradictory position, surface this before generating: "Your writing on [topic] shows a shift between 2022 and 2024. Which period should this draft draw from?" This is a pre-generation step, not a post-generation review.

**Explicit constraint definition interface.** The constraint architecture described in your AI Opportunity section needs a structured UI implementation. Before a user's first generation, they should define: topics requiring explicit approval before any content is generated, audiences for which certain language types are prohibited, document types requiring compliance review flags, and time periods for which corpus documents should not be treated as current-position sources. This is especially critical for your regulated industry segment. An IR team that does not build their constraint layer before first use will eventually have a disclosure incident.

**Complete retrieval audit log per generated draft.** Every generated draft must be accompanied by a retrievable record of: which chunks were retrieved, their source documents, their timestamps, their groundedness scores, and which sections of the draft they influenced. This is the compliance artefact that enterprise legal teams will require. Build it from day one — retrofitting audit logging after launch is expensive and incomplete.

**Source document approval workflow, not passive ingestion.** The current architecture implies automatic ingestion from connected sources. This should be inverted: documents should be ingested silently but should require explicit user approval before they influence generation. The approval workflow should show the user what PCI extracted from each document (patterns identified, positions detected) and ask for confirmation. Users should be able to mark documents as excluded, restricted (inform tone only, do not cite), or dated (use for historical context only).

**Rate limiting and per-user cost controls from day one.** The three-pattern architecture — RAG retrieval, graph retrieval, multi-model generation — is significantly more expensive per generation call than a simple LLM prompt. Build per-user generation quotas, cost caps, and usage dashboards before you have enterprise accounts. A single heavy enterprise user running 30 document generations per day across a corpus of 500 documents will generate API costs that are invisible until end of month without these controls.

---

## 4. Is There a Simpler AI Approach That Achieves the Same Outcome?

There is — and it is the right place to start, not a long-term compromise.

**The Simpler Version: Structured Prompt Assembly with Manual Context Injection**

Instead of automated corpus ingestion, vector embedding, and graph construction, build a structured brief form where the user fills in:
- Document type and audience
- Their established position on the topic (free text, they write it)
- 2–3 reference documents they upload or paste for this specific request
- Constraints: what this document should not say
- Tone and structure preferences (selected from options extracted from past usage)

The system assembles a high-quality, domain-specific generation prompt from these inputs and calls the LLM. No persistent graph. No automated retrieval. No knowledge extraction pipeline. No vector database.

This achieves the single most important outcome in your success criteria: the user stops re-establishing context in every generic LLM session. The brief form *is* the context establishment, but it is structured, guided, and produces better prompts than a user typing into ChatGPT. The output is grounded in documents the user consciously chose, not documents the system retrieved. Source attribution is explicit because the user nominated the sources.

**What this simpler version delivers:** 60–70% of PCI's core value at approximately 15–20% of the build complexity. It is shippable in weeks. It eliminates the stale position failure mode entirely (user controls what goes in). It eliminates the source attribution trust failure (user nominated the cited documents). It eliminates the multi-author corpus problem (each generation is individually configured).

**What it does not deliver:** Automatic position memory that compounds over time. Argument structure extraction from historical writing. The feedback loop that learns from edits. The Communication Intelligence Graph that grows in value with use. These are the long-term moat features. But they require the full architecture — and they require users who have already experienced the core value proposition and trust the system enough to give it their full corpus.

**The recommended sequencing:** Build the simpler version first. Use it to validate that users prefer the output to their current tools. Collect real usage data on which document types, which brief structures, and which reference document choices generate the highest satisfaction. Use that data to prioritise which parts of the full RAG and graph architecture to build first — and which users are ready to trust PCI with full corpus ingestion.

The full three-pattern architecture is correct for PCI at scale. The simpler version is correct for PCI at launch.

---

## 5. What to Manually Test Before Building the Full Product

**Test 1: Minimum Viable Corpus Quality — Does RAG Beat Manual Prompting?**

Take three real users from your target segments. Collect their 10 most representative professional documents. Manually paste those documents as context into a generation prompt in the Anthropic API console — no product built, just raw prompting. Ask each user to commission one high-stakes document they would genuinely need to send. Evaluate whether the output is meaningfully better than what they get from ChatGPT with a careful prompt.

This test must pass before you build anything. If 10 good corpus documents fed directly into a generation prompt do not produce meaningfully better output than a well-written generic prompt, the retrieval-augmented architecture has a fundamental quality problem that additional engineering will not fix. The test must use real users and real documents, not synthetic examples.

**Test 2: Stale Position Detection — Does Retrieval Return the Right Version?**

Find one user whose position on a topic has materially changed over their career. Manually retrieve the top 5 documents the embedding similarity search would return for a generation prompt on that topic. Read them. Are they the current version of this person's thinking, or the historical version? Do this for three users across three topics each.

If the retrieval consistently returns historically significant but outdated material, you have confirmed Failure Mode 1 before building the product. You can then design the temporal weighting solution with evidence rather than assumption.

**Test 3: Source Attribution Trust Suppression — Will Users Catch Distortions?**

Generate five drafts with fabricated source attributions pointing to real documents in a user's corpus. In each draft, introduce two claims that are subtly distorted from what the cited source actually says — not obviously wrong, but slightly paraphrased beyond what the source supports. Show the drafts to the user with the attribution UI and ask them to review normally. Measure whether they catch the distortions.

This is your most important safety test. If users read cited claims less critically than uncited ones — which is the expected human behaviour — then the source attribution mechanism is simultaneously your primary trust feature and your primary liability. You need to design around this finding before shipping, not after a credibility incident in production.

**Test 4: Argument Structure Extraction Accuracy — Does the Graph See What a Human Sees?**

Manually read five documents from each of three target users. Write down the argument structure you observe: how they open, how they sequence evidence, how they handle objections, how they conclude. Then run those same documents through your extraction model and compare its output to your manual analysis. Measure the agreement rate.

If agreement is below 70%, the Communication Intelligence Graph will be built on noisy foundations. This test costs one day of manual work and could save months of building in the wrong direction.

**Test 5: Thin Corpus Behaviour — What Does PCI Do With Too Little Context?**

Run generation requests with 5, 15, 30, and 100 documents from the same user. Compare output quality across the four conditions. Identify the minimum corpus size at which the output is meaningfully better than the no-corpus baseline. This tells you: how much content a user must upload before the preview draft experience is credible; what to communicate to users about onboarding expectations; and where the product should gate full functionality behind corpus completeness rather than letting users generate from an insufficient base.

**Test 6: Constraint Layer Stress Test — Does It Catch Indirect Approaches?**

Ask your most compliance-sensitive user to define five topics that must not appear in generated output without explicit approval. Then construct five generation briefs that approach those constrained topics from the side — not directly requesting the constrained content, but framing a request where a natural generation would drift toward it. Test whether the constraint detection catches all five, some, or none.

The failure rate on this test directly determines whether PCI is deployable to regulated industry users. If the constraint layer misses indirect approaches to constrained topics, an IR team or legal team cannot use PCI for their highest-stakes documents — which is precisely your target use case and the segment with highest willingness to pay.

**Test 7: The Enterprise Multi-Author Corpus — Does Averaging Produce Anyone's Voice?**

If you are targeting enterprise communications teams, take documents from two different contributors on the same team. Build a combined corpus from both. Generate a document in the shared voice. Show the output to both contributors independently and ask: "Does this sound like you?" If neither says yes, the shared CIM architecture has a fundamental problem that no amount of retrieval tuning will fix — you may need individual CIMs per user with a separate team-level consistency layer on top.

---

*Personal Communication Intelligence — Product Strategy Team | June 2026*
