/**
 * Completes the standalone bundle produced by `next build`.
 *
 * Next traces the server and its dependencies into `.next/standalone`, but
 * deliberately leaves out `public/` and `.next/static` — it assumes those are
 * served by a CDN. On a single-server deployment nothing else is serving them,
 * so the app would come up with no CSS, no fonts and no images.
 *
 * Runs automatically after `npm run build`. Plain Node with no dependencies,
 * so it behaves the same on a Windows workstation and on the host's shell.
 */
import { cp, access, mkdir, chmod } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

async function copyInto(source, destination, label) {
  if (!(await exists(source))) {
    console.warn(`[bundle] ${label} not found at ${source}; skipping.`);
    return;
  }
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  console.log(`[bundle] ${label} → ${destination.replace(root, ".")}`);
}

if (!(await exists(standalone))) {
  console.error(
    "[bundle] .next/standalone is missing. Is `output: \"standalone\"` still set in next.config.ts?",
  );
  process.exit(1);
}

await copyInto(join(root, "public"), join(standalone, "public"), "public/");
await copyInto(
  join(root, ".next", "static"),
  join(standalone, ".next", "static"),
  ".next/static",
);

/**
 * The standalone server calls `process.chdir(__dirname)` before it reads
 * anything, so it looks for `.env.production` beside itself — never in the
 * project root where you wrote it. Left to chance this presents as a server
 * that starts, reports "Ready", and then refuses every request because
 * AUTH_SECRET is missing.
 *
 * The copy stays on the same machine that already holds the original. If you
 * supply configuration through the host's own environment UI instead, there is
 * no file here to copy and this is a no-op.
 */
for (const name of [".env.production", ".env.production.local"]) {
  const source = join(root, name);
  if (!(await exists(source))) continue;

  const destination = join(standalone, name);
  await cp(source, destination);
  await chmod(destination, 0o600).catch(() => {});
  console.log(`[bundle] ${name} → .next/standalone/${name} (0600)`);
}

console.log("[bundle] standalone server ready: .next/standalone/server.js");
