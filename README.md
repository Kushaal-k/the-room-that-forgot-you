# The Room That Forgot You

**A museum remembers everything. Except the person who kept it alive.**

A complete fictional mystery across three atmospheric 3D galleries. Collect eighteen records, investigate nine connections, and restore the name of Greyhaven station's overlooked caretaker. A local open-weight archivist helps interpret the surviving evidence.

## Run locally

Requires Node.js 22.21+ and npm. On Windows, double-click **Start Museum.cmd**, or run:

```sh
npm ci
npm run dev
```

Open the printed localhost address. The Windows launcher builds and opens the stable production preview automatically. For the same production build with offline caching from a terminal:

```sh
npm run build
npm run preview
```

Use the production preview at `http://127.0.0.1:4173/` for model evaluation and offline checks. Vite's development dependency optimizer can reload the page when a worker dependency is first encountered; this is not a production behavior. Serve the build through HTTPS or localhost; do not open `dist/index.html` as a file.

## Investigate

- **W A S D** or **↑ ↓**: move. **← →**: turn. Click empty hall space to look with the mouse; **Esc** releases it.
- Click a glowing **+**, read the record, then choose **Keep this fragment**.
- **J** opens field notes. Every exhibit is also accessible here using ordinary keyboard navigation.
- **R** opens the archivist. Explicitly download the model to enable real inference.
- In **Make a connection**, choose a question and independently supporting records, then test it. Wrong theories do not remove progress.
- Three connections restore each gallery. The final gallery opens Ada's workroom.
- Settings include volume, reduced motion, captions and mouse sensitivity. Progress saves in IndexedDB on this browser and origin.

## What the AI actually does

The worker uses the quantized `Xenova/all-MiniLM-L6-v2` semantic encoder through Transformers.js to match freeform questions to discovered evidence and eligible conclusions. Clear matches use its real neural similarity scores. Ambiguous matches are narrowed to three candidates and sent to `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` through WebLLM. This retrieval stage was added after a Qwen-only benchmark missed the quality target. Code maps the selection to canonical record IDs and attaches the authored source set. All factual text shown in its answer comes from authored records. The game validates the sources before offering a connection for the player to confirm.

Undiscovered evidence and unsupported conclusions are excluded from the prompt. Model output never directly mutates progression. Only the current question is sent, avoiding an unbounded chat history. Full evidence text remains available in the journal and quoted answer cards; compact catalogue entries keep model prefill bounded. An evidence journal supports a fully authored manual investigation when the model is unavailable. That path is explicitly distinct from live AI.

The main model needs a WebGPU-capable desktop browser, a compatible graphics adapter, a substantial first download, and sufficient memory for both graphics and inference. WebLLM lists approximately 1.6 GB of GPU memory for this model before application graphics. Runtime support varies; the actual load is the final compatibility check. Inference runs on the visitor's device, never a hosted model endpoint.

Model errors and 45-second inference timeouts preserve discoveries and allow retry. The app's introductory archivist line is authored, not a generated response. The two-minute walkthrough is authored and labeled **AI inactive** throughout.

## Offline behavior

The production service worker precaches the app, worker script, fonts, recorded walkthrough and interface assets. WebLLM stores Qwen artifacts in IndexedDB; Transformers.js caches the encoder in the browser Cache API. The service worker also caches fetched MLC and ONNX runtime libraries. The unused build-time ONNX fallback WASM is excluded from static hosting; Transformers.js configures its version-pinned runtime on jsDelivr and caches it. First visits and initial downloads require internet access. Browser cache eviction, insufficient storage and missing resources can prevent offline operation.

Verify the exact deployment before claiming complete offline functionality: load the production app, download the model, finish the runtime load, close the page, disconnect networking, reopen the same origin, and run a question plus the investigation. The visible offline badge describes connectivity, not proof of complete caching. See **VERIFICATION.md** for what was actually checked.

## Evaluation

```sh
npm test
npm run build
```

Open `/evaluate` on the production server. This developer-only page exposes story spoilers and runs thirty development paraphrases, four negative/adversarial cases, and ten additional checks through the actual model worker. It exports model outputs, routing decisions, timings, expected connections and pass/fail results to JSON. It never writes game progress. The inputs live in `src/benchmarks.ts`. The final recorded run passed 43/44 cases, including 29/30 development paraphrases. Unit tests establish contract behavior; they do not measure real-model quality.

## Walkthrough and demo

**Watch the walkthrough** plays the included two-minute recorded visual synopsis without modifying your save. Settings → **Export walkthrough video** can record the canvas plus a caption track into a new WebM download. Duration metadata is repaired for seeking. On the local preview, its fixed-path export middleware also saves the recording to `public/walkthrough.webm`; that middleware is not deployed. Keep the tab foregrounded for a faithful recording. The demonstration is silent, with visible captions; it does not represent live model inference.

## Architecture

```text
React interface ──────── authored evidence and gallery state ──── Three.js museum
       │                           │
       │                      IndexedDB save
       │
       └── question + discovered records → Worker / MiniLM semantic retrieval
                                                       │
                                        ambiguous → WebLLM / Qwen
                                               │
                              structured IDs → validation → player confirmation
```

- `src/story.ts`: eighteen fragments, nine source-backed connections, three galleries and ending.
- `src/engine.ts`: evidence validation, progression checks, prompt filtering and save recovery.
- `src/Museum.tsx`: procedural museum, movement, exhibits and restorations.
- `src/archivist.worker.ts`: real inference and constrained JSON generation.
- `src/Evaluation.tsx`: real-model test runner, separate from the normal game flow.

The visual scene uses procedural geometry and staged lighting. Rendering drops to approximately ten frames per second while a query runs behind the receiver panel, leaving graphics resources for inference. Exploration performance must be measured separately on the reference device. No trained or fine-tuned model is claimed. No user accounts, remote inference, personal uploads, analytics, multiplayer, or authoring tools are present.

## Licensing and writing

Source: MIT. See THIRD_PARTY_NOTICES.md for models, fonts and dependencies. All characters, people, documents and locations in the story are fictional. The intended playtime is 25–35 minutes, pending fresh-player testing. A local challenge article draft is provided separately; it is not published or submitted.
