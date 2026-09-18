/**
 * Content-type values for the whole app — extension sets + icon/color rules.
 * To support a new file type, add its extension here; every consumer
 * (grid filters, icons, previews, editor) picks it up automatically.
 * Extensions are lowercase, WITHOUT the leading dot.
 */

/** Lowercase extension without the leading dot. */
export function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export const IMAGE_EXTS = [
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico",
] as const;

export const VIDEO_EXTS = [
  "mp4", "mkv", "avi", "mov", "webm", "flv", "ogg",
] as const;

export const AUDIO_EXTS = [
  "mp3", "flac", "wav", "ogg", "aac", "m4a",
] as const;

export const ARCHIVE_EXTS = [
  "zip", "tar", "gz", "bz2", "xz", "zst", "7z", "rar", "iso",
] as const;

export const CODE_EXTS = [
  "js", "ts", "jsx", "tsx", "py", "go", "rs", "c", "cpp",
  "java", "rb", "php", "sh", "bash",
] as const;

/** Config/data files (icon: data object). */
export const CONFIG_EXTS = [
  "yml", "yaml", "toml", "json", "xml", "env", "conf", "cfg", "ini",
] as const;

export const TEXT_DOC_EXTS = ["md", "txt", "rst", "log"] as const;
export const OFFICE_TEXT_EXTS = ["doc", "docx", "odt"] as const;
export const SHEET_EXTS = ["xls", "xlsx", "csv"] as const;
export const SLIDE_EXTS = ["ppt", "pptx"] as const;
export const DISC_EXTS = ["iso", "img", "bin"] as const;

/** "Media" grid filter = images + video + audio. */
export const MEDIA_FILTER_EXTS = [
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "mp4", "mkv", "avi", "mov",
  "mp3", "flac", "wav",
] as const;

/** "Documents" grid filter. */
export const DOCUMENT_FILTER_EXTS = [
  "pdf", "doc", "docx", "txt", "md", "odt", "xls", "xlsx", "ppt", "pptx",
] as const;

/** Files openable in the built-in text editor. */
export const EDITABLE_EXTS = [
  "txt", "md", "json", "yaml", "yml", "toml", "env", "sh", "bash",
  "js", "ts", "jsx", "tsx", "py", "go", "rs", "c", "cpp", "java",
  "rb", "php", "html", "css", "xml", "conf", "cfg", "ini", "log",
] as const;

/** Extensions rendered with a monospace code style. */
export const CODE_HIGHLIGHT_EXTS = [
  "js", "ts", "jsx", "tsx", "py", "go", "rs", "sh", "bash",
  "json", "yaml", "yml", "toml", "html", "css", "xml",
  "conf", "cfg", "ini",
] as const;

/** Extensions previewable as plain text (besides text/* MIME). */
export const PREVIEW_TEXT_EXTS = [
  "txt", "md", "log", "sh", "bash", "py", "js", "ts", "jsx", "tsx",
  "go", "rs", "c", "cpp", "java", "rb", "php", "yml", "yaml", "toml",
  "json", "xml", "env", "conf", "cfg", "ini", "css", "html", "sql", "csv",
] as const;

export interface FileTypeRule {
  /** MIME prefix match (e.g. "image/"), checked before extensions. */
  mimePrefix?: string;
  exts: readonly string[];
  /** Icon name (see Icon component) or Tailwind text-color class. */
  value: string;
}

/** Ordered icon rules — first match wins. */
export const FILE_ICON_RULES: FileTypeRule[] = [
  { mimePrefix: "image/", exts: IMAGE_EXTS, value: "image" },
  { mimePrefix: "video/", exts: VIDEO_EXTS, value: "movie" },
  { mimePrefix: "audio/", exts: AUDIO_EXTS, value: "audio_file" },
  { exts: ["pdf"], value: "picture_as_pdf" },
  // DISC before ARCHIVE: "iso" lives in both sets; it must stay a disc icon.
  { exts: DISC_EXTS, value: "disc_full" },
  { exts: ARCHIVE_EXTS, value: "folder_zip" },
  { exts: CODE_EXTS, value: "code" },
  { exts: CONFIG_EXTS, value: "data_object" },
  { exts: TEXT_DOC_EXTS, value: "description" },
  { exts: OFFICE_TEXT_EXTS, value: "article" },
  { exts: SHEET_EXTS, value: "table_chart" },
  { exts: SLIDE_EXTS, value: "slideshow" },
];

/** Ordered icon-color rules — first match wins. */
export const FILE_COLOR_RULES: FileTypeRule[] = [
  { mimePrefix: "image/", exts: IMAGE_EXTS, value: "text-primary" },
  { mimePrefix: "video/", exts: VIDEO_EXTS, value: "text-secondary" },
  { exts: ["pdf"], value: "text-error" },
  { exts: ARCHIVE_EXTS, value: "text-tertiary" },
  { exts: CODE_EXTS, value: "text-primary" },
  { exts: CONFIG_EXTS, value: "text-secondary" },
];
