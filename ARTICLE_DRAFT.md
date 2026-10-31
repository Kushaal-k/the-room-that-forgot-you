---
ai_disclosure_level: fully_autonomous
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26).*

## What I Built

The museum knows every donor's name. It cannot tell you who washed the cups.

**The Room That Forgot You** is a first-person browser mystery set in a railway museum after closing. Its archivist remembers important visitors and celebrated events. Someone else survives only in the margins: an extra cup, repeated return tickets, handwriting beneath an official signature.

You enter with a flashlight and a handheld receiver. Your job is to give that person a place in the record.

![The title screen: a rain-dark railway gallery, a clock above the arch, and a single Continue investigation button](https://raw.githubusercontent.com/Kushaal-k/the-room-that-forgot-you/main/docs/museum-title.png)

The main mechanic is **evidence changing the room**. Finding a document is only the beginning. Connect it to another record, establish what happened, and confirm the connection. A distorted space regains its sounds, shape, and meaning.

There are three galleries, eighteen records, and nine connections:

| Gallery | What the room seems to say | What the records reveal |
| --- | --- | --- |
| Departures | Someone abandoned the station. | They kept coming back. |
| Shelter | Knocking and overturned furniture suggest danger. | The station sheltered people during a flood. |
| Names | Prominent townspeople did everything worth remembering. | The caretaker's ordinary work kept the doors open. |

A presence approaches from blind spots. Hold the flashlight steadily on it to drive it back; wet footprints briefly point toward an unexamined exhibit. Discoveries affect the encounters, and restored galleries become quiet. There is no loss of collected evidence when you make a mistake.

The horror begins with an unexplained absence. The ending is an act of remembrance.

## Demo

**[Enter the museum](https://the-room-that-forgot-you.givingegret8192.chatgpt.site/)**

The game is public and needs no account. Use a desktop browser with a keyboard and mouse; Chrome or Edge with compatible WebGPU hardware is the intended setup for the live archivist.

- **WASD / arrows:** move; **Shift:** hurry.
- **Mouse:** look; **F:** flashlight; **E:** inspect a nearby object.
- **J:** field notes and connections; **R:** receiver; **Esc:** pause.
- If mouse capture is unavailable, hold the left mouse button and drag to look.

Enter, approach the return ticket, inspect it, and choose **Keep record**. Find another supporting record before proposing a connection. Progress is saved in this browser.

To test the AI, open the receiver and explicitly download the models. The first load is substantial and requires internet access. After collecting the relevant records, try: **“Did A.V. leave the station forever?”** The answer should reference discovered records and offer a connection for confirmation. Asking ahead of the evidence should not unlock anything.

**[Watch the two-minute captioned walkthrough](https://raw.githubusercontent.com/Kushaal-k/the-room-that-forgot-you/main/public/walkthrough.webm)**

That silent recording shows an earlier presentation of the investigation and is labeled **AI inactive** throughout. It demonstrates authored scenes and transformations; it does not demonstrate live inference or the latest flashlight encounters. The playable link is the current hosted build.

If live inference cannot load, the authored field notes support manual investigation, and the recorded walkthrough remains available. Those are explicitly separate from a generated answer.

## Code

**[Source on GitHub — MIT license](https://github.com/Kushaal-k/the-room-that-forgot-you)**

The submission's game snapshot is [commit 64ad8d6](https://github.com/Kushaal-k/the-room-that-forgot-you/tree/64ad8d6546f15ab7c528b1c6e9ad52e1a107abac). The repository includes the evidence graph, model worker, tests, dependency notices, and actual model-evaluation outputs.

To run locally with Node.js 22.21+:

```sh
git clone https://github.com/Kushaal-k/the-room-that-forgot-you.git
cd the-room-that-forgot-you
npm ci
npm run build
npm run preview
```

Open the localhost address printed by the preview server. On Windows, **Start Museum.cmd** handles installation, building, and opening the production preview.

## How I Built It

React 19, React Three Fiber, Three.js, TypeScript, and Vite render a procedural museum. Rain-dark windows and faded exhibits gradually give way to warmer light. A separate worker runs the archivist.

Two open-weight models do different jobs:

1. **[MiniLM](https://huggingface.co/Xenova/all-MiniLM-L6-v2)**, quantized and run through Transformers.js, matches a freeform question to discovered evidence and eligible conclusions.
2. **[Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)**, in WebLLM's `q4f16_1-MLC` format, resolves an ambiguous shortlist of up to three candidates locally through WebGPU.

Both model cards list Apache 2.0 licensing. The app's own code and fictional story are MIT licensed; model weights are separate downloads.

The first small-language-model-only approach missed too many paraphrases. Adding neural retrieval gave the language model a smaller decision to make.

The more important boundary is what happens afterward:

```text
Question + discovered archive
        → local neural retrieval
        → Qwen when ambiguous
        → structured record / connection IDs
        → evidence validation
        → player's confirmation
        → room transformation
```

The worker never receives undiscovered records. The game rejects nonexistent references and incomplete supporting evidence. It renders factual clue text from the authored archive, rather than treating generated prose as canonical history. The model cannot directly open a door or write a save.

A valid-looking answer can still be wrong. [The AI Commit's “Why Forced JSON Output Is Always Valid and Sometimes Wrong”](https://dev.to/theaicommit/why-forced-json-output-is-always-valid-and-sometimes-wrong-2jc8) makes the same distinction between parseable output and correct meaning. Here, source validation and an explicit uncertainty response are part of the game rules.

### What actually passed

The recorded game snapshot passed **21 unit tests** and its production build. Those checks cover evidence validation, save recovery, controls, and encounter logic.

The [real-model development evaluation](https://github.com/Kushaal-k/the-room-that-forgot-you/blob/64ad8d6546f15ab7c528b1c6e9ad52e1a107abac/validation/real-model-evaluation.json) passed **29/30 development paraphrases, four negative cases, and ten additional checks: 43/44 overall**.

The mixed pipeline's median response was about 12 ms, mostly from neural retrieval. Ambiguous Qwen decisions took up to 4.59 seconds. Those timings exclude model download and initialization; they are not a claim that Qwen generates answers in 12 ms.

One failure remains in the report: **“Who actually opened the station during the flood?”** retrieves the general refuge connection rather than the actor-specific credit. These are development checks, not a held-out benchmark.

The [verification log](https://github.com/Kushaal-k/the-room-that-forgot-you/blob/64ad8d6546f15ab7c528b1c6e9ad52e1a107abac/VERIFICATION.md) records the limits too. A full investigation was exercised before the latest horror pass; that pass received targeted controls checks. Fresh-player pacing, the intended 25–35 minute duration, sustained frame rate, and a complete disconnected model investigation still need verification.

## Why Does Open Innovation Matter?

The archivist runs on the visitor's computer. Questions go to a local worker, with no hosted model endpoint, inference account, or API key.

For this project, the benefit over a closed hosted API is control over the experience's continued existence. The model, retrieval catalogue, prompts, and evidence rules can be inspected and changed. A developer can replace the model while keeping the story and saves understandable. The museum need not lose its archivist because an inference provider changes pricing or retires an endpoint.

That fits the subject: preserving someone's place in history should not depend entirely on a service continuing to sell access.

Local inference also avoids a hosted per-question inference charge. It still costs hardware, electricity, storage, and an initial download. WebGPU compatibility and shared graphics memory are real constraints.

The app and model runtimes include caching, but **complete offline play has not been verified**. I am not claiming that this release already works through a disconnected reload and full investigation. A closed model could perform the reasoning; the open approach makes the reasoning setup and its dependencies available to the person preserving the game.

## The Spirit of It

The final reveal is deliberately modest: a workroom, a repaired clock, a kettle, a blue cup, and Ada Vale's name.

The apparent haunting resolves into traces of someone keeping a place safe for other people. The ending asks you to leave a light burning.

That is the intended emotional turn. I do not yet have three fresh-player sessions showing that it lands. The next useful test is watching someone discover the connections without help.

## Prize Categories

**Overall challenge entry.** I am not claiming a partner prize category. This build uses Qwen, MiniLM, WebLLM, and Transformers.js; GitHub hosting alone is not a claim of GitHub Copilot or GitHub Actions use.

---

**AI disclosure:** Codex assisted with planning, implementation, debugging, and validation, and drafted and published this write-up at my request. The article is marked `fully_autonomous` to reflect that writing workflow. The fictional story and game logic are original to this project.

