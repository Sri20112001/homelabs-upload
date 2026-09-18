export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified_at: string;
  extension?: string;
  mime_type?: string;
}

export interface ListResponse {
  path: string;
  items: FileItem[];
}

export interface StorageInfo {
  storage_root: string;
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
}

export interface SearchResponse {
  query: string;
  results: FileItem[];
}

export interface TrashItem {
  id: string;
  original_path: string;
  name: string;
  is_dir: boolean;
  size: number;
  deleted_at: string;
}

export interface FolderSizeResult {
  path: string;
  size_bytes: number;
  file_count: number;
}

export interface AppError {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: AppError;
}

export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'size' | 'modified_at' | 'type';
export type SortDir = 'asc' | 'desc';
export type FilterType = 'all' | 'folders' | 'media' | 'documents' | 'archives';

export interface TransferItem {
  id: string;
  name: string;
  size: number;
  progress: number;          // 0–100
  speed: number;             // bytes/s
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
  destPath: string;
  abortController?: AbortController;
  error?: string;
  // chunked upload state
  uploadId?: string;
  chunked?: boolean;
}

export interface SortPrefs {
  field: SortField;
  dir: SortDir;
  view: ViewMode;
}
