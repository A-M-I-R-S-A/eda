/**
 * Passenger entry point.
 *
 * Shared Node hosts (cPanel/DirectAdmin via Phusion Passenger) start an
 * application by executing a single file rather than by running `next start`.
 * This is that file.
 *
 * ── Why a custom server rather than `output: "standalone"` ────────────────
 * Standalone traces every dependency into `.next/standalone`, which is both
 * the heaviest part of the build and the part that is platform-specific. On a
 * host whose glibc is too old for Next's native compiler — where the build
 * already runs on the slower, hungrier WebAssembly fallback — that extra work
 * is what tips it over the account's limit. Keeping the ordinary build output
 * also means `.next` can be produced on another Linux machine and copied here,
 * because the platform-specific pieces stay in `node_modules` on the host.
 *
 * ── Working directory ─────────────────────────────────────────────────────
 * Passenger does not guarantee the process starts in the application root, and
 * Next resolves `.next`, `public` and the env files relative to it. Pinning it
 * here removes a class of "works locally, 404s in production" faults.
 */
const { createServer } = require("node:http");
const path = require("node:path");

process.chdir(__dirname);

const next = require("next");

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

/**
 * Refuse to serve a production site in development mode.
 *
 * `next.config.ts` keys its Content-Security-Policy off `NODE_ENV`: in
 * development it permits `unsafe-eval`. If Passenger's Application mode is
 * left on Development, that weaker policy ships to visitors silently. Failing
 * loudly is the lesser harm.
 */
if (process.env.NODE_ENV !== "production") {
  console.error(
    `refusing to start: NODE_ENV is "${process.env.NODE_ENV || "unset"}", expected "production".\n` +
      "Set Application mode to Production in Setup Node.js App and restart.",
  );
  process.exit(1);
}

const app = next({ dev: false, dir: path.resolve(__dirname) });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res).catch((error) => {
        console.error("[server] request failed", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    }).listen(port, hostname, () => {
      console.log(`[server] listening on http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("[server] failed to start", error);
    process.exit(1);
  });
