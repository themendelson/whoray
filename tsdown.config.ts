import type { UserConfig } from "tsdown";

const config: UserConfig = {
  entry: ["src/node.ts", "src/workerd.ts", "src/browser.ts", "src/cli.ts"],
  format: ["esm"],
  platform: "neutral",
  dts: true,
  deps: { neverBundle: [/^node:/, "cloudflare:sockets"] },
};

export default config;
