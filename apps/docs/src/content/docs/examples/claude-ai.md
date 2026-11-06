---
title: Build claude.ai's web chat
description: The kit's defaults are styled after claude.ai. A sidebar with chats and projects, a chat with a model picker, in about 60 lines.
sidebar:
  order: 1
---

![claude.ai built from the kit: pinned projects, Chat / Cowork, model and effort](/images/example-claude.jpg)

[Try it live in Storybook](/storybook/?path=/story/examples-claude--new-chat) (also [a conversation](/storybook/?path=/story/examples-claude--conversation))

The kit's defaults are styled after claude.ai: a warm dark (or light) page, serif message text, a sans
interface, a rounded composer with the model picker inside it. You get that look without writing any CSS.

## The shell

`AppShell` lays out a collapsible sidebar and the chat; on phones the sidebar becomes a drawer.

```tsx
import "agentic-ui-kit/styles.css";
import { AppShell, ChatList, Sidebar, SidebarItem, SidebarUser, type ChatListSection } from "agentic-ui-kit";
import { FolderOpen, MessageSquarePlus, Search } from "lucide-react";

const sections: ChatListSection[] = [
  { id: "pinned", title: "Pinned", items: [{ id: "ci", title: "Speeding up CI" }] },
  {
    id: "projects",
    title: "Projects",
    items: [{ type: "project", id: "website", name: "website", chats: [{ id: "blog", title: "Blog RSS feed" }] }],
  },
  { id: "recents", title: "Chats and tasks", items: chats.map((c) => ({ id: c.id, title: c.title, unread: c.unread })) },
];

export function App() {
  const [active, setActive] = useState<string>();
  return (
    <AppShell
      sidebar={
        <Sidebar
          brand="Chat"
          nav={
            <>
              <SidebarItem icon={<MessageSquarePlus />} label="New chat" active={!active} onPress={() => setActive(undefined)} />
              <SidebarItem icon={<Search />} label="Search" shortcut="⌘K" />
              <SidebarItem icon={<FolderOpen />} label="Projects" />
            </>
          }
          footer={<SidebarUser name="Alex" detail="Pro plan" />}
        >
          <ChatList sections={sections} {...(active && { activeId: active })} onSelect={setActive} />
        </Sidebar>
      }
    >
      <ChatPage key={active ?? "new"} id={active} />
    </AppShell>
  );
}
```

## The chat

`useChat` holds the conversation and streams from your backend through a `Transport` (here the SSE helper);
`ChatView` draws messages, thinking, tool rows and the composer.

```tsx
import { ChatHeader, ChatView, ModelPicker, SidebarToggle, sseTransport, useChat } from "agentic-ui-kit";

const transport = sseTransport({ url: "/api/chat" });

function ChatPage({ id }: { id?: string }) {
  const [title, setTitle] = useState("New chat");
  const chat = useChat({ transport, ...(id && { conversationId: id }), onTitle: setTitle });
  const [model, setModel] = useState(models[0].id);
  return (
    <ChatView
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => chat.send(text, { model })}
      onStop={chat.stop}
      onRetry={(messageId) => chat.retry(messageId, { model })}
      header={<ChatHeader leading={<SidebarToggle drawerOnly />} title={chat.messages.length ? title : ""} />}
      composer={{
        placeholder: chat.messages.length ? "Reply…" : "How can I help you today?",
        trailing: <ModelPicker models={models} model={model} onModelChange={setModel} />,
      }}
    />
  );
}
```

## The composer toolbar

claude.ai's toolbar is built from slots. `leading` holds the `+` menu (`AttachButton` with a `Menu`) and a
`SegmentedControl` for Chat / Cowork. `trailing` holds the `ModelPicker` with effort levels, plus dictation
and voice buttons. The sidebar's Chat / Code switch is a `SegmentedControl` too, with `iconOnly` options.

```tsx
composer={{
  placeholder: "How can I help you today?",
  leading: (
    <>
      <AttachButton>{addMenu}</AttachButton>
      <SegmentedControl label="Mode" value={mode} onChange={setMode}
        options={[{ id: "chat", label: "Chat" }, { id: "cowork", label: "Cowork" }]} />
    </>
  ),
  trailing: <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />,
}}
```

The full example is `apps/playground/src/stories/claude.stories.tsx`.

From here: attachments (`useAttachments`, `AttachmentRow`), effort levels in the `ModelPicker`, shared
read-only chats with `ChatTranscript`, and [inline visuals](/inline-visuals/overview/).
