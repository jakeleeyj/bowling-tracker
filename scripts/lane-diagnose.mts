// Offline lane-tracker tuning harness. Runs the real detector+session over
// raw grayscale frames extracted from a clip. Usage:
//   ffmpeg -i test-videos/CLIP.MOV -vf "scale=320:568,format=gray" -f rawvideo frames.gray
//   CLIP=frames.gray CORNERS='[[fLx,fLy],[fRx,fRy],[dLx,dLy],[dRx,dRy]]' npx tsx scripts/lane-diagnose.mts
// (corners in 720p coords, measured off a frame: ffmpeg -ss T -i CLIP.MOV -vframes 1 -vf scale=720:-2 f.png)
// Offline diagnostic: run the exact detector+session pipeline over raw
// grayscale frames extracted from Jake's alley video, logging per-frame state.
import { readFileSync } from "fs";
import { BallDetector } from "../src/lib/lane/ballDetector";
import {
  computeHomography,
  pixelToLane,
} from "../src/lib/lane/geometry";
import { ShotSession } from "../src/lib/lane/shotSession";

const W = 320;
const H = 568;
const FPS = 30;

// Corners estimated on the 720x1280 first frame, scaled by 320/720
const s = 320 / 720;
const CORNERS = process.env.CORNERS
  ? JSON.parse(process.env.CORNERS)
  : [[287, 825], [533, 820], [338, 672], [478, 672]];
const cal = {
  foulLeft: { x: CORNERS[0][0] * s, y: CORNERS[0][1] * s },
  foulRight: { x: CORNERS[1][0] * s, y: CORNERS[1][1] * s },
  deckLeft: { x: CORNERS[2][0] * s, y: CORNERS[2][1] * s },
  deckRight: { x: CORNERS[3][0] * s, y: CORNERS[3][1] * s },
};

const raw = readFileSync(process.env.CLIP ?? "frames-320x568.gray");
const frameCount = Math.floor(raw.length / (W * H));
console.log(`frames: ${frameCount}`);

const det = new BallDetector(W, H);
det.setLaneMask([cal.foulLeft, cal.foulRight, cal.deckRight, cal.deckLeft]);
const hom = computeHomography(cal);
const session = new ShotSession();

for (let f = 0; f < frameCount; f++) {
  const gray = new Uint8ClampedArray(
    raw.buffer,
    raw.byteOffset + f * W * H,
    W * H,
  );
  const tMs = (f / FPS) * 1000;
  const hit = det.detect(gray);
  const d = det.debugInfo;
  const lane = hit ? pixelToLane(hom, hit) : null;
  const ev = session.onFrame(lane, tMs, hit?.trackId);

  const cands = d.candidates
    .map((c) => `(${c.x.toFixed(0)},${c.y.toFixed(0)} a${c.area})`)
    .join(" ");
  if (d.rawBlobs > 0 || hit || ev.type !== "idle") {
    console.log(
      `f${String(f).padStart(3)} t${(tMs / 1000).toFixed(2)}s raw:${d.rawBlobs} trk:${d.tracks} ball:${d.ballId} ` +
        `cand:[${cands}] hit:${hit ? `${hit.x.toFixed(0)},${hit.y.toFixed(0)}` : "-"} ` +
        `lane:${lane ? `${lane.feet.toFixed(1)}ft b${lane.board.toFixed(1)}` : "-"} ev:${ev.type}/${session.lastFinishReason}`,
    );
  }
  if (ev.type === "complete") {
    console.log("COMPLETE:", JSON.stringify(ev.stats, null, 0).slice(0, 400));
  }
}
