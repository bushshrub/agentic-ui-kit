import { TokenCounter } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A token count that counts up as `tokens` grows. Inline is for inside a heading. */
const meta = {
  title: "Components/TokenCounter",
  component: TokenCounter,
  argTypes: {
    tokens: { control: { type: "range", min: 0, max: 50_000, step: 100 } },
    variant: { control: "inline-radio", options: ["standalone", "inline"] },
  },
  args: { tokens: 1300, variant: "standalone" },
} satisfies Meta<typeof TokenCounter>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
