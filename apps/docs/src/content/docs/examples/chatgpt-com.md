---
title: Build chatgpt.com's web chat
description: The same components as the claude.ai example, arranged and themed like chatgpt.com.
sidebar:
  order: 2
---

![chatgpt.com built from the kit: black page, pill composer with Think and dictation](/images/example-chatgpt.jpg)

[Try it live in Storybook](/storybook/?path=/story/examples-chatgpt--conversation) (also
[the new-chat screen](/storybook/?path=/story/examples-chatgpt--dark) and [light](/storybook/?path=/story/examples-chatgpt--light))

The components are the same as in [the claude.ai example](/examples/claude-ai/): `AppShell`, `Sidebar`,
`ChatList`, `ChatView`. What makes it chatgpt.com is how you fill their slots, plus a theme. The whole
example is `apps/playground/src/stories/chatgpt.stories.tsx`.

## Layout: fill the slots differently

- **Sidebar:** a bold sans brand, Search in `headerActions`, then New chat, Images, Scheduled, Library,
  Plugins and Explore as `SidebarItem`s. `ChatList` gets two plain sections, Projects and Recents, with
  no badges.
- **Header:** no chat title. The model menu sits at the left (here a `Button` reading "ChatGPT ⌄"), and
  Upgrade plus a temporary-chat button go in `actions`.
- **Composer:** `variant: "compact"` makes it one row. `+` goes in `leading`, and a Think toggle and a mic
  go in `trailing`.
- **`+` menu:** `AttachButton` takes `icon`, `className` (here a ringed circle) and `menuClassName` (here a
  width that spans the composer). Each `MenuItem` gets `descriptionPlacement="beside"`, which puts
  "Upload from computer" on the same line as "Add photos & files".
- **Message actions:** `onReadAloud` adds read aloud. `messageActions={{ time: false, extra: (m) => … }}`
  hides the time and adds Share and a "…" menu after the kit's buttons.
- **Empty state:** the greeting "What are you working on?" with no icon.

```tsx
<ChatView
  messages={chat.messages}
  busy={chat.busy}
  onSend={(text) => chat.send(text)}
  onStop={chat.stop}
  header={
    <ChatHeader
      leading={<><SidebarToggle drawerOnly /><Button variant="ghost">ChatGPT <ChevronDown /></Button></>}
      title=""
      actions={<Button variant="subtle" size="sm">Upgrade to Go</Button>}
    />
  }
  composer={{
    variant: "compact",
    placeholder: chat.messages.length ? "Ask ChatGPT" : "Ask anything",
    leading: <IconButton label="Add files and more"><Plus /></IconButton>,
    trailing: (
      <>
        <Button variant="ghost" size="sm" onPress={() => setThink(!think)}><Atom /> Think</Button>
        <IconButton label="Dictate"><Mic /></IconButton>
      </>
    ),
  }}
  emptyState={(composer) => <EmptyState greeting="What are you working on?">{composer}</EmptyState>}
  disclaimer="ChatGPT can make mistakes. Check important info."
/>
```

## Theme: variables only

`<ChatTheme theme="chatgpt">` with this CSS. The look comes from restraint: a black page, one neutral sans
for everything, few borders, a pill composer, and a round send button.

```css
[data-chat-theme="chatgpt"] {
  color-scheme: dark;
  --chat-bg: #000000;
  --chat-sidebar: #0d0d0d;
  --chat-surface: #212121; /* the composer */
  --chat-raised: #2a2a2a;
  --chat-hover: #1c1c1c;
  --chat-selected: #222222;
  --chat-bubble: #2b3a8c;
  --chat-border: #262626;
  --chat-border-strong: #3a3a3a;
  --chat-fg: #ececec;
  --chat-muted: #b4b4b4;
  --chat-subtle: #8e8e8e;
  --chat-accent: #4d6bfe; /* the send button */
  --chat-accent-fg: #ffffff;
  --chat-font-sans: ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
  --chat-font-serif: var(--chat-font-sans);
  --chat-font-message: var(--chat-font-sans);
  --chat-message-font-size: 1rem;
  --chat-bubble-font-size: 1rem;
  --chat-composer-radius: 28px; /* pill */
  --chat-send-radius: 9999px; /* round */
  --chat-shadow-popover: none;
}
```

The rest of the colors (popovers, code blocks, dividers) are in `apps/playground/src/themes.css`. So is
`chatgpt-light`, which uses a white page and a black send button:

![The light theme of the same example](/images/example-chatgpt-light.jpg)
