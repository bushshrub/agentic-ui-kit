import { ChatHeader, ChatView, DictationButton, EmptyState, sseTransport, useChat, useDictation } from "agentic-ui-kit";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

const transport = sseTransport({ url: "/api/chat", stopUrl: "/api/stop" });
// One Claude Code session per page load.
const conversationId = crypto.randomUUID();
// The server's transcription model, if it has one (see server/main.ts); else the browser's recognition.
const features = (await fetch("/api/features").then((r) => r.json())) as { transcribe: boolean };

async function transcribe(audio: Blob, signal: AbortSignal) {
  const response = await fetch("/api/transcribe", { method: "POST", headers: { "content-type": audio.type }, body: audio, signal });
  if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);
  return ((await response.json()) as { text: string }).text;
}

function App() {
  const [title, setTitle] = useState("Claude Code");
  const chat = useChat({ transport, conversationId, onTitle: setTitle });
  const dictation = useDictation({ ...(features.transcribe && { transcribe }), onError: console.error });
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
        composer={{
          placeholder: "Ask Claude Code…",
          dictation: dictation.state,
          trailing: dictation.supported && <DictationButton onPress={dictation.start} />,
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
