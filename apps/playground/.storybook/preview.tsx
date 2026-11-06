import type { Preview } from "@storybook/react-vite";
import "../src/playground.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    // What the kit builds first (whole apps, then the features), then its layers top down to the primitives.
    options: {
      storySort: {
        order: [
          "Examples", ["Claude", "ChatGPT", "Agent tools", "In host apps"],
          "Inline visuals", ["Replies", "Sandboxed HTML"],
          "Features",
          "Views",
          "Components",
          "Primitives",
        ],
      },
    },
    // Accessibility checks run on every story; violations show in the Accessibility panel.
    a11y: { test: "todo" },
    viewport: {
      options: {
        phonePortrait: { name: "Phone portrait", styles: { width: "390px", height: "844px" }, type: "mobile" },
        phoneLandscape: { name: "Phone landscape", styles: { width: "844px", height: "390px" }, type: "mobile" },
        tabletPortrait: { name: "Tablet portrait", styles: { width: "820px", height: "1180px" }, type: "tablet" },
        tabletLandscape: { name: "Tablet landscape", styles: { width: "1180px", height: "820px" }, type: "tablet" },
        laptop: { name: "Laptop", styles: { width: "1440px", height: "900px" }, type: "desktop" },
      },
    },
  },
  decorators: [
    (Story, { parameters }) => (
      <div className={`min-h-full bg-chat-bg font-chat-sans text-chat-fg ${parameters.layout === "fullscreen" ? "" : "p-8"}`}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
