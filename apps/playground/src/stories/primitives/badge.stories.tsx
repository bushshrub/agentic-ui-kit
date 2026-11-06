import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "agentic-ui-kit";
import { AlertTriangle } from "lucide-react";

/** A small tag: outlined ("Recommended") or amber ("5.5× or more usage"). */
const meta = {
  title: "Primitives/Badge",
  component: Badge,
  args: { children: "Recommended", tone: "outline" },
  argTypes: {
    children: { control: "text", description: "The tag text." },
    tone: { control: "inline-radio", options: ["outline", "warning"], description: "Outlined for information, amber for a caution." },
    icon: { control: false, description: "An icon before the text." },
  },
  parameters: { controls: { include: ["children", "tone", "icon"] } },
} satisfies Meta<typeof Badge>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The outlined tone. */
export const Default: Story = {};

/** The amber tone, for a cost or limit warning. */
export const Warning: Story = { args: { tone: "warning", children: "5.5× or more usage" } };

/** A warning badge with an icon before the text. */
export const WithIcon: Story = { args: { tone: "warning", children: "5.5× or more usage", icon: <AlertTriangle /> } };
