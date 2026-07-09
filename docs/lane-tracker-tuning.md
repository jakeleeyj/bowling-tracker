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

https://bowling-tracker-git-feat-lane-tracker-jakeleeyj-6210s-projects.vercel.app
(branch alias — always the latest push of feat/lane-tracker, no need to update)

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

## Detector v2 (2026-07-09)

The v1 detector averaged all motion into one point and failed completely on
real footage (bowler + scoreboard + handheld shake). v2:

- Groups moving pixels into connected blobs; keeps ball-like ones (size,
  compactness, aspect) inside the calibrated lane mask.
- Follows several blobs at once (multi-track). New tracks may only be born in
  the front half of the lane (a ball enters from the foul line).
- "The ball" = the track with the most net travel toward the deck since
  birth. A sliding foot nets ~10px; the ball nets its whole journey — with a
  15px switch margin the ball takes over shortly after release.
- Per-frame up-lane movement is capped (arm swings move faster than any
  ball) and stagnant tracks self-destruct.
- ShotSession rejects physically impossible jumps (budget scales with time),
  discards stalled shots, and restarts when the detector switches objects.

Verified against `test-videos/IMG_2912.MOV` (Jake, league night, handheld):
completes with 17.5 mph, release b24 → breakpoint b21 → entry b24. Offline
harness for tuning against clips lives in the session scratchpad
(`diagnose.mts` — raw gray frames via ffmpeg + real detector/session).

## Symptom → knob

| Symptom                             | Cause                                                   | Fix                                                                                                        |
| ----------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Ball rolls, no line at all          | Detector can't see ball vs lane (dim light / dark ball) | `DIFF_THRESHOLD` in `src/lib/lane/ballDetector.ts`: 40 → 25                                                |
| Line flickers, shots end mid-lane   | Detections dropping out                                 | Lower `DIFF_THRESHOLD`; and/or `LOST_MS` in `src/lib/lane/shotSession.ts`: 700 → 1000                      |
| Line follows a foot / wrong object  | Ball designation lost a race                            | Raise `BALL_SWITCH_MARGIN` down / check `BALL_NET_UP` in `ballDetector.ts`                                 |
| Track dies mid-lane                 | Ball blob too small downlane                            | Lower `MIN_BLOB_PIXELS` (5) or raise `MISS_LIMIT` (15)                                                     |
| Shot never completes (no replay)    | Ball lost before 55 ft                                  | `END_FEET` in `shotSession.ts`: 55 → 50                                                                    |
| Speed/boards look wrong             | Sloppy calibration corners                              | Re-drag the 4 corners — board accuracy is very sensitive to them                                           |
| Replay black / won't loop on iPhone | Known MediaRecorder risk                                | Report it — fallback plan exists (segment restart is already in; next step is sequential-segment playback) |

## Current constants

| Constant           | File                         | Value   |
| ------------------ | ---------------------------- | ------- |
| DIFF_THRESHOLD     | src/lib/lane/ballDetector.ts | 40      |
| MIN/MAX_BLOB       | src/lib/lane/ballDetector.ts | 5/600   |
| SEARCH_RADIUS      | src/lib/lane/ballDetector.ts | 20      |
| MAX_UP_STEP        | src/lib/lane/ballDetector.ts | 8       |
| BALL_NET_UP        | src/lib/lane/ballDetector.ts | 8       |
| BALL_SWITCH_MARGIN | src/lib/lane/ballDetector.ts | 15      |
| START/MAX_START    | src/lib/lane/shotSession.ts  | 1/30    |
| END_FEET           | src/lib/lane/shotSession.ts  | 55      |
| LOST_MS / STALL_MS | src/lib/lane/shotSession.ts  | 1000/900 |

(Update this table whenever a constant changes, with a dated note below.)

## Tuning log

- 2026-07-03: initial values, untested at alley. Camera-start bugs fixed on-device (video mount ordering + frame-loop hardening).
- 2026-07-08: alley test — v1 detector produced no usable lines (bowler/scoreboard motion swamped the centroid). Video upload mode added for offline tuning.
- 2026-07-09: detector v2 (blobs + lane mask + multi-track + ball designation). First complete tracked shot from real footage.
- 2026-07-09b: file mode no longer pauses on completion (video plays through the pin hit, result overlays). LOST_MS 700→1000, MISS_LIMIT 10→15 to hold the tiny downlane ball longer.

## Before merge (after tuning is done)

- [ ] Remove TEMP debug line in `src/components/lane/LaneTracker.tsx` + `debug` return from `useLaneCamera.ts`
- [ ] Jake's call: keep "Track shot" link only on log setup step, or add during scoring too?
- [ ] Verify replay plays on iPhone
- [ ] Merge `feat/lane-tracker` → main

## v2.1 backlog (tracker quality)

- Backfill the ball track's pre-designation history into the session (recovers
  the first ~10-15 ft of the path; release board currently reads mid-lane).
- Smooth the entry segment before computing entry board/angle (board numbers
  are corner-placement sensitive; ±3px on a deck corner ≈ ±2 boards).
- Calibrate speed against the house display (video shows 23.4 km/h on screen).
- More regression clips: straight/slow shot, different lane, tripod (not handheld).

## v1.1 backlog

Session linking (saveTrackedShot's `link` param is wired but never passed; needs UPDATE RLS policy), per-session history + breakpoint averages, ShotHistory refresh-after-save, wake-lock reacquire on visibilitychange. v1.5: rev rate via slow-mo import.
