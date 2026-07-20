/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Corsair MCP includes Node-only adapters such as Express. Keep the package
  // out of the App Router bundle so Node resolves its dynamic dependencies.
  serverExternalPackages: ["@corsair-dev/mcp"],
};

export default config;
