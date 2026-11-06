import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Composer } from "./composer";
import { encodeWav, type DictationState } from "./dictation";

afterEach(cleanup);

const dictating = (over: Partial<DictationState> = {}): DictationState => ({ levels: [0.2, 0.8], onCancel: vi.fn(), onAccept: vi.fn(), ...over });

it("fills the box with the words as they are heard, and swaps send for cancel and accept", () => {
  const { rerender } = render(<Composer onSubmit={() => {}} value="Hi" dictation={dictating()} />);
  const box = screen.getByLabelText<HTMLTextAreaElement>("Message");
  expect(box.readOnly).toBe(true);
  expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  rerender(<Composer onSubmit={() => {}} value="Hi" dictation={dictating({ transcript: "book a table" })} />);
  expect(box.value).toBe("Hi book a table");
  rerender(<Composer onSubmit={() => {}} dictation={dictating()} />);
  expect(box.placeholder).toBe("Listening…");
});

it("adds the final words on accept: returned by a model, or the live transcript", async () => {
  const onChange = vi.fn();
  const { rerender } = render(<Composer onSubmit={() => {}} value="Hi" onChange={onChange} dictation={dictating({ transcript: "book a tabl", onAccept: async () => "book a table" })} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use dictation" })));
  expect(onChange).toHaveBeenLastCalledWith("Hi book a table");
  rerender(<Composer onSubmit={() => {}} value="" onChange={onChange} dictation={dictating({ transcript: "seven tonight" })} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use dictation" })));
  expect(onChange).toHaveBeenLastCalledWith("seven tonight");
});

it("drops the words on cancel", () => {
  const onCancel = vi.fn();
  const onChange = vi.fn();
  render(<Composer onSubmit={() => {}} onChange={onChange} dictation={dictating({ transcript: "nope", onCancel })} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel dictation" }));
  expect(onCancel).toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});

it("encodes 16-bit mono WAV", async () => {
  const wav = encodeWav(new Float32Array([0, 1, -1]), 16000);
  const view = new DataView(await wav.arrayBuffer());
  const tag = (at: number) => String.fromCharCode(...new Uint8Array(view.buffer, at, 4));
  expect([tag(0), tag(8), tag(36), view.getUint32(24, true), view.getUint32(40, true)]).toEqual(["RIFF", "WAVE", "data", 16000, 6]);
  expect([view.getInt16(44, true), view.getInt16(46, true), view.getInt16(48, true)]).toEqual([0, 0x7fff, -0x7fff]);
});
