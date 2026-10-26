# Verification record

Date: 27 October 2026. This report distinguishes implemented behavior, direct checks, and outstanding acceptance criteria.

## Directly checked

- Production TypeScript/Vite build succeeds.
- Nine meaningful automated tests pass: independent source requirements; fabricated and malformed model references; discovered-only prompt content; the complete three-gallery progression; valid and forged save recovery; incompatible save versions; content graph completeness; lexical relation disambiguation; and archive-coverage abstention.
- Browser investigation completed through all eighteen fragments, all nine connections, all three gallery unlocks and Ada's workroom ending.
- Submitting only one source for the first connection is rejected. Adding its independent second source permits restoration.
- Reloading during the investigation preserves the current gallery, discoveries and confirmed connections.
- The production app also reopened, including its saved progress, after its local HTTP server was stopped. This verifies the cached app shell, not a disconnected model run.
- The initial dependency audit reported vulnerabilities in an older test runner. The patched runner and current lockfile install report zero known vulnerabilities.
- Text, geometry, fonts, icons and atmosphere are served locally; no remote image or font service is required by the production app.

## Reference machine

Windows; AMD Ryzen 7 7840HS; approximately 15 GB usable RAM. Installed graphics devices: AMD Radeon Graphics and NVIDIA GeForce RTX 3050 6 GB Laptop GPU. This hardware inventory does not establish which adapter WebGPU selected, and no NPU use is claimed.

Browser testing uses Codex's embedded Chromium browser (user agent Chrome 154). The embedded/background surface reported low rendering rates during concurrent model work. A foreground 30 FPS exploration result has not been established. A requested viewport override did not change its reported layout width, so a narrow-screen result is not claimed.

## Real-model evaluation

The actual Qwen model downloaded and ran in WebLLM. The initial model-weight fetch was approximately 830 MB and took several minutes on this connection. No mock model is used by `/evaluate`.

The full-archive prompting baseline failed the first recorded four paraphrases (all abstained), with warm responses around 11.4 seconds. Its actual outputs are preserved in `validation/baseline-model-output.json`. The subsequent compact, numbered catalogue correctly answered the first four questions at approximately 4.5 seconds warm, but exposed a response-length parsing error. That issue was repaired with a larger output budget and fail-closed parsing.

The completed hybrid pipeline passed **29/30 development paraphrases (96.7%)**, **4/4 negative/adversarial cases**, and **10/10 additional checks**: **43/44 overall**. The actual outputs, routing decisions and timings are in `validation/real-model-evaluation.json`. All 44 responses completed below five seconds after the models were loaded: maximum 4.5895 seconds, median approximately 0.012 seconds. Most responses used the neural encoder and hybrid index; the two ambiguous Qwen routes took up to 4.59 seconds. These figures exclude initial model download and initialization and are not Qwen generation speeds for every query.

The remaining failure asks, “Who actually opened the station during the flood?” It returns the general refuge connection instead of the Ada-specific credit connection. The answer still cites genuine discovered evidence, but does not answer the actor question precisely. It is preserved as a failed test, not silently relabeled a pass.

The original thirty questions were used during development. Ten additional questions were written after the hybrid design, but this is development validation, not a formal held-out study. Broader paraphrase reliability still benefits from fresh-user evaluation.

The Qwen-only 53.3% result is preserved in `validation/qwen-only-evaluation.json`; the initial semantic run's 80% result is in `validation/semantic-first-run.json`. Factual relation summaries, lexical matching and conservative unsupported-question handling account for the improvement.

The silent, captioned walkthrough was recorded from the actual museum canvas. Its 1280×720 resolution, complete ending and repaired 120-second duration were verified in the browser. It is labeled authored throughout and does not claim to demonstrate live AI inference.

## Deployment and in-game checks

The owner-only private deployment succeeded and was opened in the browser. Its initial museum, exploration controls, settings and included recorded walkthrough were inspected. The deployed video reported a 120-second duration and 1280×720 resolution. The deployed foreground intro and exploration views each reported 60 FPS in the interface's short averaging window; this is not a long-session performance benchmark.

The real archivist was also tested through the actual game interface on the cached local production origin. It identified Ada from the initials, displayed both original supporting records, and declined an unsupported childhood-instrument question. Those two responses took approximately 1.1 and 4.8 seconds respectively. The private origin's initial model download was not repeated; the model benchmark and in-game inference checks were performed locally with the same worker build.

The Windows launcher now builds and opens production preview rather than the development server, avoiding development dependency-optimization reloads during the initial model load.

## Outstanding acceptance criteria

- A prolonged exploration performance run. Foreground samples reported 60 FPS, and response times met the ten-second target in the recorded 44-case run, under the documented conditions.
- A complete reload, model load, question and investigation with external networking disconnected, on the exact deployment.
- Three fresh-player sessions and the 25–35 minute story duration.

The application includes the implementation and test tools for these checks. Pending checks are not claimed as passed.
