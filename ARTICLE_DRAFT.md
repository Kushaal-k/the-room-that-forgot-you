---
title: "The Room That Forgot You: teaching a museum to remember its caretaker"
published: false
tags: devchallenge, hf26challenge, ai, opensource
---

*Unpublished draft. Add the final preview, video, source-repository link and measured results before submission. AI assisted with the concept, writing and implementation; disclose that assistance in the published entry.*

*This is a submission draft for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26).*

## What I Built

The museum knows every donor's name. It cannot tell you who washed the cups.

The Room That Forgot You is a fictional 3D mystery set in a closed railway museum. Its eighteen surviving records tell the story of someone who kept returning after the trains stopped, opened the building during a flood, and then disappeared from the official exhibition.

As you connect the fragments, the space changes. A departure board becomes an arrivals board. A stopped clock begins to tick. Three frightening knocks become a rescue signal. The final room holds ordinary things: a clock, a kettle, a blue cup, and the name Ada Vale.

I interpreted “Ghost in the Machine” as an absence in the record. The haunting comes from what the museum failed to preserve.

## Demo

Insert the verified private/public preview and captioned two-minute video here. The authored walkthrough is explicitly labeled **AI inactive**; show a separate real-model interaction when demonstrating inference.

## Code

The original application and story are MIT licensed. Insert the public source repository if and when it is published. The delivered source includes the evidence graph, local inference worker, tests, license notices and real-model evaluation page.

## How I Built It

React, React Three Fiber and Three.js render a procedural museum. A quantized MiniLM encoder, running locally through Transformers.js, retrieves relevant records and conclusions. WebLLM runs the Apache-2.0 Qwen2.5-1.5B-Instruct model in the same worker to disambiguate a shortlist when the semantic match is uncertain. The archivist receives only discovered records and connections those records can establish.

Instead of accepting arbitrary model prose as history, the worker returns structured record and connection IDs. The interface renders factual content from the authored source material. Code checks that the records exist, have been discovered, and support the proposed connection. The visitor then confirms it. The retrieval stage was added because the standalone small language model missed the paraphrase target in actual testing; see the verification report for the measured progression.

That division lets the model interpret a visitor's phrasing while keeping the mystery consistent. A fabricated quotation cannot open a door.

## Why Does Open Innovation Matter?

The archivist runs on the visitor's own graphics hardware. Questions do not go to a hosted inference service, and there is no model API key to distribute or keep funded.

The model, runtime, prompt and evidence rules can all be inspected. Another developer can replace the archivist, test its mistakes, or preserve the experience independently of an inference provider. Open weights make that maintenance possible.

These advantages have a cost: a substantial initial download, graphics-memory requirements and browser compatibility limits. The evidence journal remains playable when live inference is unavailable; it is not presented as a generated conversation. The production app caches its own assets, and the model caches locally, but complete offline support should only be claimed after the exact deployment passes a disconnected test.

## What I Verified

See VERIFICATION.md for the current record. Unit tests cover forged citations, insufficient evidence, prompt filtering, saved-progress recovery and the complete story graph. The browser investigation has been exercised through all three galleries and the ending. The real-model benchmark is separate and exports actual outputs and timings.

The final real-model run passed 29/30 development paraphrases, all four negative cases, and ten additional checks: 43/44 overall. Median response time was about 12 ms for the mixed pipeline, with most questions answered by neural retrieval; Qwen disambiguation took up to 4.59 seconds. These exclude download and initialization. One actor-specific flood question still retrieves a general refuge answer. The report preserves that failure and the earlier Qwen-only and semantic-only results. This is development validation, not a formal held-out study.

The cached application reopened after its local server was stopped. A fully disconnected model run, foreground 30 FPS performance and the intended 25–35 minute duration remain unverified. Three fresh-player sessions are still needed. Do not present those targets as measured outcomes.

## The Spirit of It

The intended final moment is small. The unsettling presence was the trace of a person doing the work that made a place safe. You restore her name, then leave the light on.

Whether that moment moves a fresh player remains a playtesting question. I want to show those reactions honestly when they exist.

## References

- [Qwen2.5-1.5B-Instruct model and license](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- [WebLLM](https://github.com/mlc-ai/web-llm)
- [NOT IN CORPUS — teaching a local model to abstain instead of hallucinate](https://dev.to/qaevelyn/not-in-corpus-teaching-a-local-model-to-abstain-instead-of-hallucinate-3hbm), by qaevelyn. A useful reminder to test questions the archive cannot answer.

No sponsor category is claimed in this draft. Add one only if the final implementation genuinely uses the required technology and meets its current rules.
