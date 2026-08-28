// FILE: composingOrbPainter.ts
// Purpose: Paints the fixed 20px Composing/Ribbon orb used by HarnessOS's live status row.
// Layer: Web UI presentation primitive
//
// Copied-adapted from thinking-orbs@0.3.1, commit
// bd204b73c9b6660fad7210b1ad48d9dc2adbb89d:
//   src/engine/core.ts, src/engine/profiles.ts, src/engine/ribbon.ts, src/presets.ts
// MIT license: ../../../../../LICENSES/thinking-orbs-MIT.txt
//
// This file intentionally owns only the official Composing/Ribbon 20px preset.
// The other eight states, 64px profiles, registries, and public configuration API
// are not product dependencies and must not be reintroduced here.

export const COMPOSING_ORB_CSS_SIZE = 20;
export const COMPOSING_ORB_SPEED = 3.12;
export const COMPOSING_ORB_STATIC_TIME_SECONDS = 0.6;

const TAU = Math.PI * 2;
const RADIUS = (COMPOSING_ORB_CSS_SIZE / 2) * 0.78;
const DOT_RADIUS_SCALE = (COMPOSING_ORB_CSS_SIZE / 300) ** 0.6;

// Exact resolution of the upstream 20px preset:
// base lanes/segs 5/88 × sqrt(.051) => 2/20, then bandMul 4.94 => 10 lanes;
// ghostN 150 × .051 => 8; rBase/rDepth × 1.073.
const LANE_COUNT = 10;
const SEGMENT_COUNT = 20;
const GHOST_COUNT = 8;
const RADIUS_BASE = 1.1 * 1.073;
const RADIUS_DEPTH = 1.7 * 1.073;
const MIN_DOT_RADIUS = 0.3;

export interface ComposingOrbDot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly white: number;
  readonly alpha: number;
}

type Projector = (x: number, y: number, z: number) => readonly [number, number, number];

function fibonacciDirection(index: number, count: number): readonly [number, number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (2 * (index + 0.5)) / count;
  const radius = Math.sqrt(1 - y * y);
  const angle = index * golden;
  return [radius * Math.cos(angle), y, radius * Math.sin(angle)];
}

function makeProjection(yaw: number, tilt: number, centerX: number, centerY: number): Projector {
  const sinTilt = Math.sin(tilt);
  const cosTilt = Math.cos(tilt);
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  return (x, y, z) => {
    const rotatedX = x * cosYaw + z * sinYaw;
    const rotatedZ = -x * sinYaw + z * cosYaw;
    const rotatedY = y * cosTilt - rotatedZ * sinTilt;
    const depth = y * sinTilt + rotatedZ * cosTilt;
    return [centerX + rotatedX, centerY - rotatedY, depth];
  };
}

/** Pure, deterministic geometry for one official Composing/Ribbon frame. */
export function createComposingOrbFrame(timeSeconds: number): readonly ComposingOrbDot[] {
  const center = COMPOSING_ORB_CSS_SIZE / 2;
  // The official Composing preset pins spin to zero. The band orientation is
  // fixed while the two traveling waves continue to move along its surface.
  const project = makeProjection(0, 0.3, center, center);
  const dots: ComposingOrbDot[] = [];

  for (let index = 0; index < GHOST_COUNT; index += 1) {
    const direction = fibonacciDirection(index, GHOST_COUNT);
    const [x, y, z] = project(direction[0] * RADIUS, direction[1] * RADIUS, direction[2] * RADIUS);
    const depth = (z / RADIUS + 1) / 2;
    dots.push({
      x,
      y,
      z,
      radius: Math.max(MIN_DOT_RADIUS, 0.8 * DOT_RADIUS_SCALE),
      white: 0.78,
      alpha: 0.1 + 0.22 * depth,
    });
  }

  const bandTilt = 0.55;
  const axisX = 1;
  const axisY = 0;
  const axisZ = 0;
  const tangentX = 0;
  const tangentY = Math.cos(bandTilt);
  const tangentZ = Math.sin(bandTilt);
  const normalX = axisY * tangentZ - axisZ * tangentY;
  const normalY = axisZ * tangentX - axisX * tangentZ;
  const normalZ = axisX * tangentY - axisY * tangentX;

  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    const laneOffset = (lane - (LANE_COUNT - 1) / 2) * 0.075;
    const edge = Math.abs(lane - (LANE_COUNT - 1) / 2) / ((LANE_COUNT - 1) / 2);
    for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
      const angle = (segment / SEGMENT_COUNT) * TAU;
      const wobble =
        0.16 * Math.sin(angle * 3 - timeSeconds * 1.7 + lane * 0.22) +
        0.07 * Math.sin(angle * 5 + timeSeconds * 1.1);
      const offset = laneOffset + wobble;
      const rawX = axisX * Math.cos(angle) + tangentX * Math.sin(angle) + normalX * offset;
      const rawY = axisY * Math.cos(angle) + tangentY * Math.sin(angle) + normalY * offset;
      const rawZ = axisZ * Math.cos(angle) + tangentZ * Math.sin(angle) + normalZ * offset;
      const length = Math.sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ);
      const [x, y, z] = project(
        (rawX / length) * RADIUS,
        (rawY / length) * RADIUS,
        (rawZ / length) * RADIUS,
      );
      const depth = (z / RADIUS + 1) / 2;
      dots.push({
        x,
        y,
        z,
        radius: Math.max(
          MIN_DOT_RADIUS,
          (RADIUS_BASE + RADIUS_DEPTH * depth) * (1 - 0.25 * edge) * DOT_RADIUS_SCALE,
        ),
        white: 0.52 - 0.44 * depth + 0.18 * edge,
        alpha: 0.4 + 0.6 * depth,
      });
    }
  }

  dots.sort((left, right) => left.z - right.z);
  return dots;
}

/** Paint one frame onto a context already scaled to CSS pixels. */
export function paintComposingOrbFrame(
  context: CanvasRenderingContext2D,
  timeSeconds: number,
  dark: boolean,
): void {
  const dots = createComposingOrbFrame(timeSeconds);
  for (const dot of dots) {
    const white = Math.min(1, Math.max(0, dot.white));
    const gray = Math.round((dark ? 1 - white : white) * 255);
    context.fillStyle = `rgba(${gray},${gray},${gray},${dot.alpha})`;
    context.beginPath();
    context.arc(dot.x, dot.y, dot.radius, 0, TAU);
    context.fill();
  }
}
