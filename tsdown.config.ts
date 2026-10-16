import type { UserConfig } from "tsdown";

const config: UserConfig[] = [
  { entry: ["src/node.ts"], format: ["esm", "cjs"], platform: "node", dts: true },
  { entry: ["src/cli.ts"], format: ["esm"], platform: "node" },
  {
    entry: ["src/workerd.ts", "src/browser.ts"],
    format: ["esm"],
    platform: "neutral",
    deps: { neverBundle: ["cloudflare:sockets"] },
  },
];

export default config;
