import type { UserConfig } from "tsdown";

const config: UserConfig = {
  entry: {
    node: "src/runtime/node.ts",
    workerd: "src/runtime/workerd.ts",
    browser: "src/runtime/browser.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  platform: "neutral",
  dts: true,
  deps: { neverBundle: [/^node:/, "cloudflare:sockets"] },
};

export default config;
