import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

// Every story renders as a test in a real browser, and its `play` function runs; a story tagged
// "!test" is left out. Chrome itself (the installed browser), so nothing extra is downloaded.
export default defineConfig({
  plugins: [tailwindcss(), storybookTest({ configDir: join(import.meta.dirname, ".storybook") })],
  publicDir: "public",
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: "chrome" } }),
      instances: [{ browser: "chromium" }],
    },
    setupFiles: ["./.storybook/vitest.setup.ts"],
  },
});
