/**
 * Copied-adapted from the pinned upstream splash DOM source recorded in
 * source-adoptions.json. Keeps the upstream synchronous golden-angle particle
 * construction while adapting product identity and host lifecycle ownership.
 */

const DOT_COUNT = 64;
const GOLDEN_ANGLE_RAD = 137.508 * (Math.PI / 180);
const SPREAD = 13.2;

function buildDots(): string {
  let html = "";
  for (let index = 1; index <= DOT_COUNT; index += 1) {
    const radius = SPREAD * Math.sqrt(index);
    const theta = index * GOLDEN_ANGLE_RAD;
    const x = Math.round(radius * Math.cos(theta));
    const y = Math.round(radius * Math.sin(theta));
    const size = Math.max(3, 13.5 - radius * 0.1 + ((index * 7) % 3) - 1);
    const opacity = Math.min(1, Math.max(0.35, 1.02 - radius * 0.0065));
    const duration = 3.1 + ((index * 13) % 37) / 10;
    const delay = -((index * 29) % 67) / 10;
    const exitX = Math.round(x * 3 + Math.cos(theta) * 1100);
    const exitY = Math.round(y * 3 + Math.sin(theta) * 1100);
    html += `<i class="startup-splash__dot" style="--x:${x}px;--y:${y}px;--ex:${exitX}px;--ey:${exitY}px;--s:${size.toFixed(1)}px;--o:${opacity.toFixed(2)};--t:${duration.toFixed(1)}s;--dl:${delay.toFixed(1)}s"></i>`;
  }
  return html;
}

export function createStartupSplashDom(): HTMLElement {
  document.getElementById("startup-splash")?.remove();
  const splash = document.createElement("div");
  splash.id = "startup-splash";
  splash.innerHTML = `
    <div class="startup-splash__visual" aria-hidden="true">
      <div class="startup-splash__swarm">
        <div class="startup-splash__swarm-in">
          <div class="startup-splash__swarm-breathe">${buildDots()}</div>
        </div>
      </div>
      <div class="startup-splash__word">HAROS</div>
    </div>`;
  document.body.append(splash);
  return splash;
}
