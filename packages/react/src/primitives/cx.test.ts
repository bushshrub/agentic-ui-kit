import { expect, it } from "vitest";
import { cx } from "./cx";

it("lets a later class replace the kit's class for the same property", () => {
  expect(cx("h-8 px-2.5", "h-7")).toBe("px-2.5 h-7");
  expect(cx("size-8", false, undefined, "size-10")).toBe("size-10");
  expect(cx("w-full max-w-2xl", "max-w-sm")).toBe("w-full max-w-sm");
});

it("knows the kit's radius, shadow and animation utilities", () => {
  expect(cx("rounded-chat-sm", "rounded-none")).toBe("rounded-none");
  expect(cx("rounded-chat-sm", "rounded-chat-lg")).toBe("rounded-chat-lg");
  expect(cx("rounded-chat-lg", "rounded-md")).toBe("rounded-md");
  expect(cx("shadow-chat-popover", "shadow-none")).toBe("shadow-none");
  expect(cx("animate-chat-in", "animate-none")).toBe("animate-none");
});

it("keeps classes that do not conflict: font size next to text color, radius next to shadow", () => {
  expect(cx("text-(length:--chat-ui-font-size) text-chat-fg")).toBe("text-(length:--chat-ui-font-size) text-chat-fg");
  expect(cx("text-chat-fg", "text-chat-muted")).toBe("text-chat-muted");
  expect(cx("bg-chat-surface", "bg-chat-accent")).toBe("bg-chat-accent");
  expect(cx("rounded-chat-sm shadow-chat-popover font-chat-sans")).toBe("rounded-chat-sm shadow-chat-popover font-chat-sans");
  expect(cx("font-chat-sans font-medium")).toBe("font-chat-sans font-medium");
  expect(cx("text-(length:--chat-ui-font-size)", "text-lg")).toBe("text-lg");
});
