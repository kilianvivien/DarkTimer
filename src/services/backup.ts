import {
  exportStoredData,
  importStoredData,
  type StoredDataImport,
  type StoredDataImportResult,
  type StoredDataSnapshot,
} from './storage';

const BACKUP_APP_ID = 'darktimer';
const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile extends StoredDataSnapshot {
  app: typeof BACKUP_APP_ID;
  formatVersion: number;
  exportedAt: number;
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

export async function createBackup(): Promise<BackupFile> {
  const snapshot = await exportStoredData();

  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    ...snapshot,
  };
}

export function getBackupFileName(exportedAt: number): string {
  const date = new Date(exportedAt);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `darktimer-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

function readArray(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key];

  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BackupFormatError(`Backup file is damaged: "${key}" is not a list.`);
  }

  return value;
}

export function parseBackup(text: string): StoredDataImport {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupFormatError('This file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BackupFormatError('This file is not a DarkTimer backup.');
  }

  const source = parsed as Record<string, unknown>;

  if (source.app !== BACKUP_APP_ID) {
    throw new BackupFormatError('This file is not a DarkTimer backup.');
  }

  if (typeof source.formatVersion !== 'number' || source.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError('This backup was made by a newer version of DarkTimer.');
  }

  return {
    settings: source.settings,
    presets: readArray(source, 'presets'),
    sessions: readArray(source, 'sessions'),
    chems: readArray(source, 'chems'),
  };
}

export async function restoreBackup(text: string): Promise<StoredDataImportResult> {
  return importStoredData(parseBackup(text));
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getBackupFileName(backup.exportedAt);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously cancels the download in Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Asks the browser not to evict IndexedDB under storage pressure. Resolves to
// whether storage is persistent; false when unsupported or declined.
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    if (await navigator.storage.persisted()) {
      return true;
    }

    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
