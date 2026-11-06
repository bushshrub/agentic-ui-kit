/**
 * Voice dictation in the composer, similar to claude.ai's: while listening the words fill the box as they are
 * heard ("Listening…" before the first), a dotted meter follows the voice, and ✕ / ✓ take the send button's
 * place. The kit draws the state and records; the words come from a transcription model the host plugs in
 * (`useDictation({ transcribe })`), or from the browser's speech recognition without one.
 */
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "../primitives/button";
import { useIcons } from "../primitives/icons";
import { useLabels } from "../primitives/labels";

/** What the composer shows while dictating. Pass it as `Composer`'s `dictation`; leave it unset otherwise. */
export interface DictationState {
  /** Input levels from 0 to 1, oldest first. The meter shows the newest ones. */
  levels: readonly number[];
  /** The words heard so far, shown in the box. Empty or unset: the "Listening…" placeholder. */
  transcript?: string;
  /** ✕: stop and drop the words. */
  onCancel: () => void;
  /**
   * ✓: stop and return the final words, which the composer adds to its text. Return nothing to use
   * `transcript`; return a promise to finish transcribing (the box reads "Transcribing…" meanwhile).
   */
  onAccept: () => void | string | Promise<string | void>;
}

export interface VoiceMeterProps {
  levels: readonly number[];
  /** How many dots. */
  count?: number;
  className?: string;
}

/** A row of dots that grow into bars with the voice; flat dots when it is quiet. */
export function VoiceMeter({ levels, count = 16, className }: VoiceMeterProps) {
  const recent = levels.slice(-count);
  const dots = [...Array<number>(count - recent.length).fill(0), ...recent];
  return (
    <div aria-hidden className={clsx("flex h-6 items-center gap-[3px] px-1", className)}>
      {dots.map((level, i) => (
        <span
          key={i}
          className="chat-voice-dot w-[3px] rounded-full bg-chat-subtle transition-[height] duration-75"
          style={{ height: `${Math.max(3, Math.min(1, level) * 20)}px` }}
        />
      ))}
    </div>
  );
}

export interface DictationButtonProps {
  onPress: () => void;
  isDisabled?: boolean;
  className?: string;
}

/** The mic button that starts dictation; put it in the composer's `trailing`. */
export function DictationButton({ onPress, isDisabled, className }: DictationButtonProps) {
  const icons = useIcons();
  const labels = useLabels();
  return (
    <IconButton label={labels.dictate} onPress={onPress} {...(isDisabled && { isDisabled })} {...(className && { className })}>
      {icons.mic}
    </IconButton>
  );
}

/** The meter, ✕ and ✓: what the composer shows in place of send while dictating. */
export function DictationControls({ dictation, onAccept, finishing }: { dictation: DictationState; onAccept: () => void; finishing?: boolean }) {
  const icons = useIcons();
  const labels = useLabels();
  const square = "rounded-[var(--chat-send-radius,var(--chat-radius-md))]! bg-chat-raised border border-chat-border";
  return (
    <div className="flex items-center gap-1">
      <VoiceMeter levels={dictation.levels} />
      <IconButton label={labels.dictationCancel} onPress={dictation.onCancel} className={square}>
        {icons.dictationCancel}
      </IconButton>
      <IconButton label={labels.dictationAccept} onPress={onAccept} isDisabled={finishing} className={square}>
        {icons.dictationAccept}
      </IconButton>
    </div>
  );
}

// The Web Speech API, as far as it is used here (not in lib.dom for every target).
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionClass = new () => Recognition;
const recognitionClass = (): RecognitionClass | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, RecognitionClass | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export interface UseDictationOptions {
  /**
   * Your transcription model: gets the recording (see `format`), returns its text. Without it the
   * browser's speech recognition is used where there is one (in Chrome that sends audio to Google).
   */
  transcribe?: (audio: Blob, signal: AbortSignal) => Promise<string>;
  /**
   * What `transcribe` gets. "wav" (default): 16 kHz mono WAV, which every transcription API takes.
   * "recorded": the browser's own recording (webm/opus in Chrome and Firefox, mp4 in Safari), smaller,
   * for APIs that take it.
   */
  format?: "wav" | "recorded";
  /**
   * With `transcribe`: while the user talks, transcribe what is recorded so far this often (ms) so the
   * words fill the box live, even with a model that does not stream. 0 transcribes only on ✓. Default 1500.
   */
  partialEvery?: number;
  /** BCP 47 language for the browser's recognition, e.g. "en-US". Defaults to the page's language. */
  lang?: string;
  /** The mic was refused, recording or transcribing failed. */
  onError?: (error: unknown) => void;
}

export interface Dictation {
  /** Dictation can work here (a mic, and `transcribe` or the browser's recognition). Hide the mic otherwise. */
  supported: boolean;
  /** Start listening. */
  start: () => void;
  /** Pass to the composer's `dictation`; undefined when not listening. */
  state: DictationState | undefined;
}

/** Encodes mono samples as 16-bit PCM WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
  return new Blob([view.buffer], { type: "audio/wav" });
}

/** A recording (whatever MediaRecorder made) as 16 kHz mono WAV, the format transcription APIs all take. */
async function toWav(recording: Blob): Promise<Blob> {
  const decoder = new AudioContext();
  try {
    const decoded = await decoder.decodeAudioData(await recording.arrayBuffer());
    const rate = 16000;
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return encodeWav((await offline.startRendering()).getChannelData(0), rate);
  } finally {
    void decoder.close();
  }
}

interface Session {
  stop: () => void;
  /** The final words: stops recording and transcribes it all (or the browser's last result). */
  finish: () => Promise<string>;
}

/**
 * Dictation for the composer: records the mic, draws its level, and fills the box with the words as they
 * are heard. Plug in your transcription model with `transcribe`; a streaming model can instead drive
 * `DictationState` directly.
 */
export function useDictation({ transcribe, format = "wav", partialEvery = 1500, lang, onError }: UseDictationOptions = {}): Dictation {
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const session = useRef<Session | undefined>(undefined);
  const latest = useRef({ transcribe, format, partialEvery, lang, onError });
  latest.current = { transcribe, format, partialEvery, lang, onError };

  const reset = useCallback(() => {
    session.current?.stop();
    session.current = undefined;
    setActive(false);
    setTranscript("");
    setLevels([]);
  }, []);
  useEffect(() => reset, [reset]);

  const start = useCallback(() => {
    if (session.current || typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const { transcribe, format, partialEvery, lang, onError } = latest.current;
    const audioOf = (blob: Blob) => (format === "wav" ? toWav(blob) : Promise.resolve(blob));
    const Recognition = transcribe ? undefined : recognitionClass();
    if (!transcribe && !Recognition) return;
    const abort = new AbortController();
    const cleanups: (() => void)[] = [() => abort.abort()];
    const stop = () => cleanups.splice(0).forEach((f) => f());
    let heard = "";
    const fail = (error: unknown) => {
      if (abort.signal.aborted) return;
      onError?.(error);
      reset();
    };

    // The words, from the browser.
    let recognition: Recognition | undefined;
    if (Recognition) {
      recognition = new Recognition();
      const r = recognition;
      r.continuous = true;
      r.interimResults = true;
      r.lang = lang ?? document.documentElement.lang;
      r.onresult = (e) => setTranscript((heard = Array.from(e.results, (x) => x[0]?.transcript ?? "").join("").trim()));
      r.onerror = (e) => e.error !== "no-speech" && e.error !== "aborted" && fail(new Error(e.error));
      // The service stops on its own after a pause; keep listening until ✕ or ✓.
      r.onend = () => !abort.signal.aborted && r.start();
      r.start();
      cleanups.push(() => ((r.onend = null), r.abort()));
    }

    // The mic: its level for the meter and, for `transcribe`, the recording.
    const chunks: Blob[] = [];
    let recorder: MediaRecorder | undefined;
    const ready = navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (abort.signal.aborted) return stream.getTracks().forEach((t) => t.stop());
      cleanups.push(() => stream.getTracks().forEach((t) => t.stop()));
      const audio = new AudioContext();
      cleanups.push(() => void audio.close());
      const analyser = audio.createAnalyser();
      analyser.fftSize = 512;
      audio.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let last = 0;
      let frame = requestAnimationFrame(function tick(now) {
        frame = requestAnimationFrame(tick);
        if (now - last < 70) return;
        last = now;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += v * v;
        setLevels((l) => [...l.slice(-31), Math.min(1, Math.sqrt(sum / samples.length) * 6)]);
      });
      cleanups.push(() => cancelAnimationFrame(frame));
      if (!transcribe) return;

      const r = new MediaRecorder(stream);
      recorder = r;
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.start(250);
      cleanups.push(() => r.state !== "inactive" && r.stop());
      // Live words from a model that does not stream: transcribe what is recorded so far, one at a time.
      if (partialEvery > 0) {
        let busy = false;
        const timer = setInterval(() => {
          if (busy || !chunks.length) return;
          busy = true;
          audioOf(new Blob(chunks, { type: r.mimeType }))
            .then((wav) => transcribe(wav, abort.signal))
            .then((text) => !abort.signal.aborted && setTranscript((heard = text.trim())))
            .catch(() => {})
            .finally(() => (busy = false));
        }, partialEvery);
        cleanups.push(() => clearInterval(timer));
      }
    }, fail);

    session.current = {
      stop,
      finish: async () => {
        if (!transcribe) return stop(), heard;
        await ready;
        const r = recorder;
        if (r && r.state !== "inactive") {
          await new Promise<void>((done) => {
            r.addEventListener("stop", () => done(), { once: true });
            r.stop();
          });
        }
        if (!chunks.length) return stop(), heard;
        const text = await transcribe(await audioOf(new Blob(chunks, { type: r?.mimeType })), abort.signal);
        stop();
        return text.trim();
      },
    };
    setActive(true);
  }, [reset]);

  const accept = useCallback(async () => {
    const s = session.current;
    if (!s) return;
    try {
      return await s.finish();
    } catch (error) {
      latest.current.onError?.(error);
      return undefined;
    } finally {
      if (session.current === s) reset();
    }
  }, [reset]);

  return {
    supported: typeof navigator !== "undefined" && !!navigator.mediaDevices && (!!transcribe || recognitionClass() !== undefined),
    start,
    state: active ? { levels, transcript, onCancel: reset, onAccept: accept } : undefined,
  };
}
