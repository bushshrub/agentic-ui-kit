import { Composer, DictationButton, useDictation, type DictationState } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const meta: Meta = { title: "Features/Voice dictation" };
export default meta;

const spoken = "Book a table for two at seven tonight, somewhere quiet near the office.".split(" ");

/** Dictation with a stand-in for the mic and the transcription model: words arrive as they are "heard". */
function SimulatedDictation() {
  const [listening, setListening] = useState(false);
  const [levels, setLevels] = useState<number[]>([]);
  const [words, setWords] = useState(0);
  useEffect(() => {
    if (!listening) return;
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      setLevels((l) => [...l.slice(-31), tick % 9 < 6 ? 0.2 + Math.random() * 0.8 : 0.03]);
      if (tick % 4 === 0) setWords((w) => Math.min(spoken.length, w + 1));
    }, 80);
    return () => clearInterval(timer);
  }, [listening]);
  const stop = () => (setListening(false), setLevels([]), setWords(0));
  const dictation: DictationState | undefined = listening
    ? {
        levels,
        transcript: spoken.slice(0, words).join(" "),
        onCancel: stop,
        // A model that finishes after ✓: the box reads "Transcribing…" meanwhile.
        onAccept: () => new Promise<string>((done) => setTimeout(() => (stop(), done(spoken.join(" "))), 900)),
      }
    : undefined;
  return <Composer onSubmit={() => {}} dictation={dictation} trailing={<DictationButton onPress={() => setListening(true)} />} />;
}

/** The browser's own speech recognition (no transcription model plugged in). Needs a mic and Chrome or Safari. */
function BrowserDictation() {
  const dictation = useDictation({ onError: console.error });
  return (
    <Composer
      onSubmit={() => {}}
      placeholder={dictation.supported ? "Press the mic and talk" : "This browser has no speech recognition"}
      dictation={dictation.state}
      trailing={dictation.supported && <DictationButton onPress={dictation.start} />}
    />
  );
}

/**
 * Voice dictation, similar to claude.ai's: the words fill the box as they are heard, a dotted meter follows the
 * voice, ✕ drops the words and ✓ keeps them. Plug in a transcription model with `useDictation({ transcribe })`.
 */
export const Dictation: StoryObj = {
  name: "Composer",
  render: () => (
    <div className="flex w-[40rem] flex-col gap-6">
      <SimulatedDictation />
      <BrowserDictation />
    </div>
  ),
};
