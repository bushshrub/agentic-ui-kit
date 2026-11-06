import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  // Props tables from the kit's source (its types and JSDoc). The default react-docgen: the TypeScript one
  // needs the TS JS API, which TypeScript 7 (native) no longer has.
  typescript: { reactDocgen: "react-docgen" },

  staticDirs: ["../public"],
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    return config;
  },
};

export default config;
