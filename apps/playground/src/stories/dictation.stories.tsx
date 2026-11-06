import { Composer, DictationButton, useDictation, type ComposerProps, type DictationState, VoiceMeter } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

const spoken = "Book a table for two at seven tonight, somewhere quiet near the office.".split(" ");


/** Dictation with a stand-in for the mic and the transcription model: words arrive as they are "heard". */
function SimulatedDictation(props: ComposerProps) {
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
  return <Composer {...props} dictation={dictation} trailing={<DictationButton onPress={() => setListening(true)} />} />;
}

/** The browser's own speech recognition (no transcription model plugged in). Needs a mic and Chrome or Safari. */
function BrowserDictation(props: ComposerProps) {
  const dictation = useDictation({ onError: console.error });
  return (
    <Composer
      placeholder={dictation.supported ? "Press the mic and talk" : "This browser has no speech recognition"}
      {...props}
      dictation={dictation.state}
      trailing={dictation.supported && <DictationButton onPress={dictation.start} />}
    />
  );
}

/**
 * Voice dictation, similar to claude.ai's: the words fill the box as they are heard, a dotted meter follows the
 * voice, ✕ drops the words and ✓ keeps them. Plug in a transcription model with `useDictation({ transcribe })`.
 */
const meta = {
  title: "Features/Voice dictation",
  component: Composer,
  subcomponents: { DictationButton, VoiceMeter },
  render: (args) => <SimulatedDictation {...args} />,
  parameters: { controls: { exclude: ["leading", "trailing", "above", "dictation", "value", "onChange", "className"] } },
  args: { onSubmit: fn() },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Press the mic, then ✓ (the "model" takes a moment): the words land in the box. */
export const Simulated: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Dictate" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Use dictation" }));
    await waitFor(() => expect(canvas.getByRole("textbox")).toHaveValue(spoken.join(" ")));
  },
};

/** The browser's own recognition. Needs a real mic. */
export const Browser: Story = { tags: ["!test"], render: (args) => <BrowserDictation {...args} /> };
