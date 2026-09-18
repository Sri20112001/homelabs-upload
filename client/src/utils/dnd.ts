/**
 * Drag-and-drop helpers that keep internal move-drags (grabbing a file/folder
 * already on the server) separate from external OS file drops (uploads).
 *
 * Without the custom MIME type, grabbing a file card — especially an image
 * thumbnail, which the browser drags natively as `Files` — looks exactly
 * like a desktop upload to the grid dropzone and wrongly triggers an upload.
 */

export const INTERNAL_DND_TYPE = "application/x-nodevault-path";

function dragTypes(e: { dataTransfer: DataTransfer }): string[] {
  return Array.from(e.dataTransfer.types ?? []);
}

/** True when the drag started from one of our own file cards/rows. */
export function isInternalDrag(e: { dataTransfer: DataTransfer }): boolean {
  return dragTypes(e).includes(INTERNAL_DND_TYPE);
}

/** True only for genuine external OS file drops (desktop → browser). */
export function isExternalFileDrag(e: { dataTransfer: DataTransfer }): boolean {
  const t = dragTypes(e);
  return t.includes("Files") && !t.includes(INTERNAL_DND_TYPE);
}

export function setInternalDrag(
  e: { dataTransfer: DataTransfer },
  path: string,
): void {
  // Custom type marks the drag as ours; text/plain stays as fallback so the
  // path is still readable in onDrop (custom types are unreadable before drop
  // in some browsers, but IS readable in drop — belt and suspenders).
  e.dataTransfer.setData(INTERNAL_DND_TYPE, path);
  e.dataTransfer.setData("text/plain", path);
  e.dataTransfer.effectAllowed = "move";
}

/** Server path being moved, or null when this isn't an internal drag. */
export function getInternalPath(e: { dataTransfer: DataTransfer }): string | null {
  if (!isInternalDrag(e)) return null;
  return (
    e.dataTransfer.getData(INTERNAL_DND_TYPE) ||
    e.dataTransfer.getData("text/plain") ||
    null
  );
}
