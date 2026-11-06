---
title: Voice dictation
description: "A mic in the composer: the words fill the box as they are heard. Plug in a transcription model, streaming or not."
sidebar:
  order: 6
---

The composer has a dictation state similar to claude.ai's. While the user talks, the words fill the box as
they are heard ("Listening…" before the first), a dotted meter follows their voice, and ✕ / ✓ take the
send button's place. ✕ drops the words; ✓ adds them to whatever was already typed.

The kit records and draws. **The words come from a transcription model you plug in**, e.g. Whisper,
Parakeet, Deepgram, or your provider's `/audio/transcriptions` endpoint. A model is the recommended
setup, but not required: without one, `useDictation` uses the browser's own speech recognition where there
is one (Chrome and Safari; Chrome sends the audio to Google).

## Plug in a transcription model

```tsx
import { ChatView, DictationButton, useDictation } from "agentic-ui-kit";

// Your server forwards the audio to the model, so the key stays on the server.
async function transcribe(audio: Blob, signal: AbortSignal): Promise<string> {
  const res = await fetch("/api/transcribe", { method: "POST", headers: { "content-type": audio.type }, body: audio, signal });
  if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
  return (await res.json()).text;
}

function Chat() {
  const dictation = useDictation({ transcribe, onError: (e) => console.error(e) });
  return (
    <ChatView
      /* … */
      composer={{
        dictation: dictation.state,
        trailing: dictation.supported && <DictationButton onPress={dictation.start} />,
      }}
    />
  );
}
```

On the server, send the audio on as a multipart upload. With an OpenAI-compatible API:

```ts
const form = new FormData();
form.set("model", process.env.TRANSCRIBE_MODEL!);
form.set("file", new Blob([body], { type: "audio/wav" }), "speech.wav");
const res = await fetch(`${process.env.TRANSCRIBE_URL}/audio/transcriptions`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.TRANSCRIBE_API_KEY}` },
  body: form,
});
const { text } = await res.json();
```

[`examples/claude-code-acp`](https://github.com/bushshrub/agentic-ui-kit/tree/main/examples/claude-code-acp)
does exactly this, set up by `TRANSCRIBE_URL`, `TRANSCRIBE_MODEL` and `TRANSCRIBE_API_KEY`.

### The audio

`transcribe` gets a 16 kHz mono WAV by default. Every transcription API takes that, and some take nothing
else. For an API that takes compressed audio, `format: "recorded"` passes the browser's own recording
instead (webm/opus in Chrome and Firefox, mp4 in Safari), which is several times smaller.

### Streaming or not

Ideally, plug in a **streaming** model: the words then appear as the user says them, at the model's pace.
A model that does not stream works too. While the user talks, `useDictation` transcribes what has been
recorded so far every `partialEvery` ms (default 1500) and fills the box with the result. On ✓ it
transcribes the whole recording once more for the final words, and the box reads "Transcribing…" meanwhile.
These partial requests grow with the recording, so for long dictation prefer a streaming model or set
`partialEvery: 0` to transcribe only on ✓.

To use a streaming model's own protocol (a WebSocket, server-sent partials), skip `useDictation` and
drive the composer yourself:

```tsx
<Composer
  dictation={listening ? {
    levels,               // 0–1 mic levels, oldest first; the meter shows the newest
    transcript,           // the words so far, from your stream
    onCancel: stop,
    onAccept: () => finish(), // return the final words, or a promise of them; nothing keeps `transcript`
  } : undefined}
/>
```

## The parts

- `Composer`'s `dictation` (and `ChatView`'s `composer.dictation`): set while dictating, unset otherwise.
- `useDictation({ transcribe?, format?, partialEvery?, lang?, onError? })` returns `{ supported, start, state }`.
  Hide the mic when `supported` is false: no microphone, or neither a model nor the browser's recognition.
- `DictationButton`: the mic. `VoiceMeter`: the dots, for your own layouts. `encodeWav(samples, rate)`.
- Labels `listening`, `transcribing`, `dictate`, `dictationCancel`, `dictationAccept`; icons `mic`,
  `dictationCancel`, `dictationAccept`. Theme the dots with `.chat-voice-dot`.
