import { ChatHeader, ChatView, EmptyState, sseTransport, useChat } from "agentic-ui-kit";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

const transport = sseTransport({ url: "/api/chat", stopUrl: "/api/stop" });
// One Claude Code session per page load.
const conversationId = crypto.randomUUID();

function App() {
  const [title, setTitle] = useState("Claude Code");
  const chat = useChat({ transport, conversationId, onTitle: setTitle });
  return (
    <div className="h-dvh">
      <ChatView
        header={<ChatHeader title={title} />}
        messages={chat.messages}
        busy={chat.busy}
        onSend={(text) => chat.send(text)}
        onStop={chat.stop}
        approvals={chat.approvals}
        onApprove={chat.respond}
        emptyState={(composer) => <EmptyState greeting="What should Claude Code do?">{composer}</EmptyState>}
        composer={{ placeholder: "Ask Claude Code…" }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
