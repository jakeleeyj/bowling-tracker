# Lane Tracker — Alley Tuning Guide

Live QA/tuning notes for the camera ball tracker (`/lane`, branch `feat/lane-tracker`).
Workflow: bowl → note symptom below → change ONE constant → push → refresh preview on phone.

## What a shot produces (table: `tracked_shots`, one row per saved shot)

| Field                                         | Meaning                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `speed_mph`                                   | Ball speed, foul line → pins (numeric, 1 decimal)                        |
| `release_board`                               | Board at first tracked point (board 1 = right edge, 39 = left edge)      |
| `arrows_board`                                | Board crossing the arrows (15 ft)                                        |
| `breakpoint_board`                            | Furthest-out board (max deviation from release board)                    |
| `entry_board`                                 | Board at the pins (~17.5 = righty pocket)                                |
| `path`                                        | Full line: ≤60 points of `{board, feet, tMs}` (jsonb) — redraws the shot |
| `session_id` / `game_number` / `frame_number` | Link to scoring session — always null in v1 (v1.1 wiring)                |
| `user_id`, `created_at`                       | Owner + timestamp; RLS owner-only                                        |

UI per shot: speed + the 4 boards over a looping video replay with the traced line. Rev rate is NOT in v1 (needs slow-mo import, v1.5).

## Current preview

https://bowling-tracker-53bvkzk0f-jakeleeyj-6210s-projects.vercel.app
(each push builds a new URL — update this line after pushing)

## Testing without the alley (video upload)

Lane Tracker → "Upload a video" → pick a recorded shot (film from the same
tripod-behind-approach angle). Calibrate on the first frame, then it plays
through the exact same detector/session pipeline — same knobs apply. Speed
uses the video's own clock, so stats are correct even if playback lags.
Multi-shot videos work: after each result, "Next" resumes playback.
This is the fastest tuning loop: record a few shots at the alley once, then
tune constants against those files at home.

## Setup at the alley

1. Tripod behind the approach, frame the FULL lane — foul line and pins both in view
2. Dashboard → Lane Tracker → Start camera
3. Calibrate: tap lane corners in order — foul line left, foul line right, pin deck left, pin deck right
4. Bowl. Line draws live; replay + stats after the ball reaches the pins
5. Phone got bumped? Tap the re-calibrate button (top right)

## Symptom → knob

| Symptom                             | Cause                                                   | Fix                                                                                                        |
| ----------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Ball rolls, no line at all          | Detector can't see ball vs lane (dim light / dark ball) | `DIFF_THRESHOLD` in `src/lib/lane/ballDetector.ts`: 40 → 25                                                |
| Line flickers, shots end mid-lane   | Detections dropping out                                 | Lower `DIFF_THRESHOLD`; and/or `LOST_MS` in `src/lib/lane/shotSession.ts`: 700 → 1000                      |
| Ghost lines when nobody bowls       | Noise (neighbors, pin sweep, reflections)               | Raise `DIFF_THRESHOLD` or `MIN_BLOB_PIXELS` in `ballDetector.ts`: 8 → 20                                   |
| Line includes arm/body swing        | Motion near foul line picked up                         | `START_FEET` in `shotSession.ts`: 1 → 6                                                                    |
| Shot never completes (no replay)    | Ball lost before 55 ft                                  | `END_FEET` in `shotSession.ts`: 55 → 50                                                                    |
| Speed/boards look wrong             | Sloppy calibration taps                                 | Re-calibrate carefully — no code change                                                                    |
| Replay black / won't loop on iPhone | Known MediaRecorder risk                                | Report it — fallback plan exists (segment restart is already in; next step is sequential-segment playback) |

## Current constants

| Constant        | File                         | Value |
| --------------- | ---------------------------- | ----- |
| DIFF_THRESHOLD  | src/lib/lane/ballDetector.ts | 40    |
| MIN_BLOB_PIXELS | src/lib/lane/ballDetector.ts | 8     |
| BG_ALPHA        | src/lib/lane/ballDetector.ts | 0.05  |
| START_FEET      | src/lib/lane/shotSession.ts  | 1     |
| END_FEET        | src/lib/lane/shotSession.ts  | 55    |
| LOST_MS         | src/lib/lane/shotSession.ts  | 700   |

(Update this table whenever a constant changes, with a dated note below.)

## Tuning log

- 2026-07-03: initial values, untested at alley. Camera-start bugs fixed on-device (video mount ordering + frame-loop hardening).

## Before merge (after tuning is done)

- [ ] Remove TEMP debug line in `src/components/lane/LaneTracker.tsx` + `debug` return from `useLaneCamera.ts`
- [ ] Jake's call: keep "Track shot" link only on log setup step, or add during scoring too?
- [ ] Verify replay plays on iPhone
- [ ] Merge `feat/lane-tracker` → main

## v1.1 backlog

Session linking (saveTrackedShot's `link` param is wired but never passed; needs UPDATE RLS policy), per-session history + breakpoint averages, ShotHistory refresh-after-save, wake-lock reacquire on visibilitychange. v1.5: rev rate via slow-mo import.
