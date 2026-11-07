import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { AttachmentCard, AttachmentRow } from "./attachments";

afterEach(cleanup);

const thumb = (attachment: Parameters<typeof AttachmentCard>[0]["attachment"]) => render(<AttachmentCard attachment={attachment} />).container.querySelector("img");

it("shows a thumbnail for an image url without a mime type", () => {
  expect(thumb({ name: "photo", url: "https://cdn.example/a/photo.PNG?sig=1" })?.getAttribute("src")).toBe("https://cdn.example/a/photo.PNG?sig=1");
});

it("takes kind when there is no mime, and prefers the mime when there is one", () => {
  expect(thumb({ name: "upload", kind: "image", url: "https://cdn.example/blob/9" })).not.toBeNull();
  expect(thumb({ name: "pic.png", kind: "file", url: "https://cdn.example/pic.png" })).toBeNull();
  expect(thumb({ name: "doc.pdf", mime: "application/pdf", url: "https://cdn.example/x.png" })).toBeNull();
});

it("shows a file card for a non-image url", () => {
  const { container } = render(<AttachmentCard attachment={{ name: "report.pdf", url: "https://cdn.example/report.pdf" }} />);
  expect(container.querySelector("img")).toBeNull();
  expect(container.textContent).toContain("PDF");
});

it("composer row: an image card opens the full image and keeps its remove button", async () => {
  render(
    <AttachmentRow
      attachments={[{ id: "d1", kind: "image", name: "shot.png", mime: "image/png", size: 1, previewUrl: "blob:shot", status: "ready" }]}
      onRemove={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "Remove shot.png" })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Open image shot.png" }));
  expect(screen.getByRole("dialog", { name: "shot.png" })).toBeTruthy();
});
