// Forces the Cloudflare Worker name after Nitro generates .output/server/wrangler.json.
// Runs as the last step of `npm run build`, so it always wins regardless of how the
// Lovable/TanStack Start/Nitro plugin chain derived (or ignored) a name upstream.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// 👉 Change this to whatever lowercase name you want your Worker to have.
const WORKER_NAME = "digital-logic-design";

const WRANGLER_PATH = ".output/server/wrangler.json";

if (!existsSync(WRANGLER_PATH)) {
  console.warn(`⚠ ${WRANGLER_PATH} not found — skipping worker name patch (did the build fail?)`);
  process.exit(0);
}

const config = JSON.parse(readFileSync(WRANGLER_PATH, "utf-8"));
const previousName = config.name;
config.name = WORKER_NAME;
writeFileSync(WRANGLER_PATH, JSON.stringify(config, null, 2) + "\n");

console.log(`✔ Worker name patched: "${previousName}" -> "${WORKER_NAME}" in ${WRANGLER_PATH}`);
