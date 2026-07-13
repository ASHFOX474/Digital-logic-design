import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      nitro({
        preset: "cloudflare-module",
        cloudflare: {
          wrangler: {
            name: "Digital-Logic-Design", // <-- put whatever lowercase name you want here
          },
        },
      }),
    ],
  },
});