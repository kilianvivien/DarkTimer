import React, { useEffect, useRef, useState } from 'react';
import {
  BackupFormatError,
  createBackup,
  downloadBackup,
  parseBackup,
  requestPersistentStorage,
} from '../services/backup';
import { importStoredData, type StoredDataImport } from '../services/storage';

export const BackupSection: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<StoredDataImport | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void requestPersistentStorage().then((persistent) => {
      if (active) {
        setIsPersistent(persistent);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage('');
    setError('');

    try {
      const backup = await createBackup();
      downloadBackup(backup);
      setMessage(
        `Backup saved: ${backup.presets.length} presets, ${backup.sessions.length} sessions, ${backup.chems.length} chemistry batches.`,
      );
    } catch (exportError) {
      console.error('Failed to export backup:', exportError);
      setError('Backup could not be created.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = '';

    if (!file) {
      return;
    }

    setMessage('');
    setError('');

    try {
      setPendingImport(parseBackup(await file.text()));
    } catch (parseError) {
      setPendingImport(null);
      setError(
        parseError instanceof BackupFormatError ? parseError.message : 'Backup file could not be read.',
      );
    }
  };

  const handleImport = async () => {
    if (!pendingImport) {
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const result = await importStoredData(pendingImport);
      setPendingImport(null);
      setMessage(
        `Restored ${result.presets} presets, ${result.sessions} sessions, ${result.chems} chemistry batches${result.settingsRestored ? ', and settings' : ''}.`,
      );
    } catch (importError) {
      console.error('Failed to restore backup:', importError);
      setError('Backup could not be restored. Nothing was changed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="border border-dark-border p-4 space-y-4">
      <div className="space-y-1">
        <p className="mono-label text-white">Backup & restore</p>
        <p className="text-xs text-ui-gray leading-relaxed">
          Save presets, session history, chemistry batches, and settings to a JSON file, or restore them on another device or browser. API keys are never included.
        </p>
        {isPersistent === false ? (
          <p className="text-xs text-ui-gray leading-relaxed">
            This browser may clear DarkTimer data when storage runs low. Keep a backup of anything you want to keep.
          </p>
        ) : null}
      </div>

      {pendingImport ? (
        <div className="space-y-3 border border-dark-border bg-black/20 p-4">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-white">
            Restore this backup?
          </p>
          <p className="text-xs leading-relaxed text-ui-gray">
            {pendingImport.presets.length} presets, {pendingImport.sessions.length} sessions, and {pendingImport.chems.length} chemistry batches will be merged into this device. Matching items are overwritten{pendingImport.settings ? ' and settings are replaced' : ''}; everything else is kept.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={isImporting}
              className="utilitarian-button px-4 py-3 text-xs font-mono uppercase tracking-widest disabled:opacity-60"
            >
              {isImporting ? 'Restoring…' : 'Yes, Restore'}
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              disabled={isImporting}
              className="utilitarian-button px-4 py-3 text-xs font-mono uppercase tracking-widest disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className="utilitarian-button w-full sm:w-auto px-4 py-3 text-xs font-mono uppercase tracking-widest disabled:opacity-60"
          >
            {isExporting ? 'Exporting…' : 'Export Backup'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="utilitarian-button w-full sm:w-auto px-4 py-3 text-xs font-mono uppercase tracking-widest"
          >
            Restore From File
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        aria-label="Backup file"
        className="hidden"
        onChange={(event) => void handleFileSelected(event)}
      />

      {message ? <p className="text-xs font-mono text-ui-gray" role="status">{message}</p> : null}
      {error ? <p className="text-xs font-mono text-accent-red" role="alert">{error}</p> : null}
    </div>
  );
};
