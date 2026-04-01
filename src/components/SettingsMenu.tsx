import React, { useEffect, useId, useState } from 'react';
import { Save, Eye, EyeOff, ExternalLink, Shield, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AIProvider,
  ApiKeyPersistenceMode,
  PhaseCountdown,
  UserSettings,
} from '../services/settings';
import { notificationsSupported, notificationPermission, requestNotificationPermission } from '../services/notifications';

export interface SettingsSaveRequest {
  settings: UserSettings;
  apiKeys: Record<AIProvider, string>;
  apiKeysChanged: boolean;
  passphrase: string;
  confirmPassphrase: string;
}

interface SettingsMenuProps {
  apiKeys: Record<AIProvider, string>;
  hasEncryptedApiKeys: boolean;
  isVaultLocked: boolean;
  onClearHistory: () => Promise<void>;
  onForgetSavedKeys: (settings: UserSettings) => Promise<void>;
  onSettingsChange: (settings: UserSettings) => Promise<void>;
  onSave: (request: SettingsSaveRequest) => Promise<void>;
  onUnlockSavedKeys: (passphrase: string) => Promise<void>;
  sessionCount: number;
  settings: UserSettings;
}

interface DurationSettingFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const DurationSettingField: React.FC<DurationSettingFieldProps> = ({ label, value, onChange }) => {
  const mins = Math.floor(value / 60);
  const secs = value % 60;

  const updatePart = (part: 'min' | 'sec', nextValue: number) => {
    const safeValue = Math.max(0, nextValue);
    const totalSeconds = part === 'min' ? safeValue * 60 + secs : mins * 60 + Math.min(59, safeValue);
    onChange(totalSeconds);
  };

  return (
    <div className="space-y-2">
      <label className="mono-label">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <input
            type="number"
            value={mins}
            onChange={(e) => updatePart('min', parseInt(e.target.value) || 0)}
            className="utilitarian-input mobile-form-control-inline flex-1 min-w-0 text-center"
            min="0"
          />
          <span className="text-[10px] font-mono text-ui-gray uppercase shrink-0">m</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <input
            type="number"
            value={secs}
            onChange={(e) => updatePart('sec', parseInt(e.target.value) || 0)}
            className="utilitarian-input mobile-form-control-inline flex-1 min-w-0 text-center"
            min="0"
            max="59"
          />
          <span className="text-[10px] font-mono text-ui-gray uppercase shrink-0">s</span>
        </div>
      </div>
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, hint, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="border-t border-dark-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="press-feedback w-full flex items-center justify-between py-4 text-left group"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <div className="space-y-0.5">
          <span className="text-sm font-bold uppercase tracking-widest text-white group-hover:text-white transition-colors">
            {title}
          </span>
          {hint && !open && (
            <p className="text-[10px] font-mono text-ui-gray uppercase tracking-widest">{hint}</p>
          )}
        </div>
        <span className="font-mono text-ui-gray text-xl leading-none ml-4 shrink-0 group-hover:text-white transition-colors">
          {open ? '−' : '+'}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-6 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface PreferenceToggleProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onToggle: () => void;
}

const PreferenceToggle: React.FC<PreferenceToggleProps> = ({
  checked,
  disabled = false,
  label,
  description,
  onToggle,
}) => {
  const descriptionId = useId();
  return (
    <div className="flex items-start justify-between gap-4 border border-dark-border p-4">
      <div className="space-y-1 min-w-0">
        <p className="mono-label text-white">{label}</p>
        <p id={descriptionId} className="text-xs text-ui-gray leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`press-feedback relative inline-flex h-6 w-11 items-center border transition-colors focus:outline-none ${
          checked ? 'bg-accent-red border-accent-red' : 'bg-transparent border-dark-border'
        } disabled:opacity-40`}
        aria-checked={checked}
        aria-label={label}
        aria-describedby={descriptionId}
        role="switch"
      >
        <span className={`inline-block h-4 w-4 transform bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
};

function hasAnyApiKeys(apiKeys: Record<AIProvider, string>): boolean {
  return Boolean(apiKeys.gemini.trim() || apiKeys.mistral.trim());
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  apiKeys,
  hasEncryptedApiKeys,
  isVaultLocked,
  onClearHistory,
  onForgetSavedKeys,
  onSettingsChange,
  onSave,
  onUnlockSavedKeys,
  sessionCount,
  settings: initialSettings,
}) => {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [geminiApiKey, setGeminiApiKey] = useState(apiKeys.gemini);
  const [mistralApiKey, setMistralApiKey] = useState(apiKeys.mistral);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [securePassphrase, setSecurePassphrase] = useState('');
  const [securePassphraseConfirm, setSecurePassphraseConfirm] = useState('');
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [permissionStatus, setPermissionStatus] = useState(notificationPermission());
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isForgettingKeys, setIsForgettingKeys] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const vibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    setGeminiApiKey(apiKeys.gemini);
    setMistralApiKey(apiKeys.mistral);
  }, [apiKeys.gemini, apiKeys.mistral]);

  useEffect(() => {
    if (!isVaultLocked) {
      setUnlockError('');
      setUnlockPassphrase('');
    }
  }, [isVaultLocked]);

  useEffect(() => {
    if (sessionCount === 0) {
      setConfirmClearHistory(false);
    }
  }, [sessionCount]);

  const updateSettings = async (nextSettings: UserSettings) => {
    const previousSettings = settings;
    setSettings(nextSettings);
    setIsSavingSettings(true);
    setSettingsError('');

    try {
      await onSettingsChange(nextSettings);
    } catch (error) {
      setSettings(previousSettings);
      setSettingsError(error instanceof Error ? error.message : 'Settings could not be updated.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChange = <K extends keyof UserSettings>(field: K, value: UserSettings[K]) => {
    void updateSettings({ ...settings, [field]: value });
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermissionStatus(result);
    if (result === 'granted') {
      await updateSettings({ ...settings, notificationsEnabled: true });
    }
  };

  const handleSave = async () => {
    const normalizedApiKeys = {
      gemini: geminiApiKey.trim(),
      mistral: mistralApiKey.trim(),
    };
    const apiKeysChanged =
      normalizedApiKeys.gemini !== apiKeys.gemini.trim() ||
      normalizedApiKeys.mistral !== apiKeys.mistral.trim();
    const shouldRequirePassphrase =
      settings.apiKeyPersistenceMode === 'encrypted' &&
      hasAnyApiKeys(normalizedApiKeys) &&
      (!hasEncryptedApiKeys || apiKeysChanged);

    if (settings.apiKeyPersistenceMode === 'encrypted') {
      if (shouldRequirePassphrase && !securePassphrase) {
        setSaveError('Enter a passphrase to securely remember your API keys on this device.');
        return;
      }

      if ((securePassphrase || securePassphraseConfirm) && securePassphrase !== securePassphraseConfirm) {
        setSaveError('Passphrase confirmation does not match.');
        return;
      }
    }

    setIsSaving(true);
    setSaveError('');

    try {
      await onSave({
        settings,
        apiKeys: normalizedApiKeys,
        apiKeysChanged,
        passphrase: securePassphrase,
        confirmPassphrase: securePassphraseConfirm,
      });
      setSecurePassphrase('');
      setSecurePassphraseConfirm('');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Settings could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockPassphrase) {
      setUnlockError('Enter your passphrase to unlock the saved API keys.');
      return;
    }

    setIsUnlocking(true);
    setUnlockError('');

    try {
      await onUnlockSavedKeys(unlockPassphrase);
      setUnlockPassphrase('');
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : 'Saved keys could not be unlocked.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleForgetSavedKeys = async () => {
    setIsForgettingKeys(true);
    setSaveError('');

    try {
      const nextSettings = {
        ...settings,
        apiKeyPersistenceMode: 'session' as ApiKeyPersistenceMode,
      };

      await onForgetSavedKeys(nextSettings);
      setSettings(nextSettings);
      setGeminiApiKey('');
      setMistralApiKey('');
      setSecurePassphrase('');
      setSecurePassphraseConfirm('');
      setUnlockPassphrase('');
      setUnlockError('');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Saved keys could not be forgotten.');
    } finally {
      setIsForgettingKeys(false);
    }
  };

  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    setHistoryError('');

    try {
      await onClearHistory();
      setConfirmClearHistory(false);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Session history could not be cleared.');
    } finally {
      setIsClearingHistory(false);
    }
  };

  return (
    <div className="w-full max-w-xl space-y-8">

      {/* Development settings */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-2">
        <div className="space-y-1 pb-2">
          <h2 className="text-xl font-bold uppercase tracking-tight">Development Settings</h2>
          <p className="text-xs text-ui-gray font-mono uppercase tracking-widest">
            Default chemistry timings and process temperatures
          </p>
        </div>

        <CollapsibleSection
          title="Black & White"
          hint="Developer · Stop Bath · Fixer · Wash"
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DurationSettingField
              label="Developer"
              value={settings.defaultBwDeveloper}
              onChange={(value) => handleChange('defaultBwDeveloper', value)}
            />
            <DurationSettingField
              label="Stop Bath"
              value={settings.defaultStopBath}
              onChange={(value) => handleChange('defaultStopBath', value)}
            />
            <DurationSettingField
              label="Fixer"
              value={settings.defaultFixer}
              onChange={(value) => handleChange('defaultFixer', value)}
            />
            <DurationSettingField
              label="Wash"
              value={settings.defaultWash}
              onChange={(value) => handleChange('defaultWash', value)}
            />
          </div>
          <div className="space-y-1">
            <label className="mono-label">Temperature (°C)</label>
            <input
              type="number"
              value={settings.defaultBwTempC}
              onChange={(e) => handleChange('defaultBwTempC', parseFloat(e.target.value) || 0)}
              className="utilitarian-input mobile-form-control-inline w-full md:w-40"
              step="0.5"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Color Negative & Slide"
          hint="Developer · Blix · Wash"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DurationSettingField
              label="Developer"
              value={settings.defaultColorDeveloper}
              onChange={(value) => handleChange('defaultColorDeveloper', value)}
            />
            <DurationSettingField
              label="Blix"
              value={settings.defaultColorBlix}
              onChange={(value) => handleChange('defaultColorBlix', value)}
            />
            <DurationSettingField
              label="Wash"
              value={settings.defaultColorWash}
              onChange={(value) => handleChange('defaultColorWash', value)}
            />
          </div>
          <p className="text-xs text-ui-gray font-mono">Stop bath is not included for color process.</p>
          <div className="space-y-1">
            <label className="mono-label">Temperature (°C)</label>
            <input
              type="number"
              value={settings.defaultColorTempC}
              onChange={(e) => handleChange('defaultColorTempC', parseFloat(e.target.value) || 0)}
              className="utilitarian-input mobile-form-control-inline w-full md:w-40"
              step="0.5"
            />
          </div>
        </CollapsibleSection>

        <div className="space-y-4 border-t border-dark-border pt-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest">Phase Countdown</h3>
            <p className="text-xs text-ui-gray font-mono">Delay before each phase starts, with audible beeps.</p>
          </div>
          <div className="grid grid-cols-3 border border-dark-border">
            {([0, 5, 10] as PhaseCountdown[]).map((val, i) => (
              <button
                key={val}
                type="button"
                onClick={() => handleChange('phaseCountdown', val)}
                className={`press-feedback px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  i < 2 ? 'border-r border-dark-border' : ''
                } ${
                  settings.phaseCountdown === val
                    ? 'bg-white text-black'
                    : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]'
                }`}
                aria-pressed={settings.phaseCountdown === val}
              >
                {val === 0 ? 'No delay' : `${val} sec`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI settings */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-2">
        <div className="space-y-1 pb-2">
          <h2 className="text-xl font-bold uppercase tracking-tight">AI Settings</h2>
          <p className="text-xs text-ui-gray font-mono uppercase tracking-widest">
            Provider selection and API keys for recipe search
          </p>
        </div>

        <div className="space-y-2 border-t border-dark-border pt-4 pb-2">
          <label className="mono-label">Default Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {(['gemini', 'mistral'] as AIProvider[]).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleChange('aiProvider', provider)}
                className={`utilitarian-button px-4 py-3 text-xs font-mono uppercase tracking-widest ${
                  settings.aiProvider === provider ? 'bg-white text-black border-white' : ''
                }`}
                aria-pressed={settings.aiProvider === provider}
              >
                {provider === 'gemini' ? 'Gemini' : 'Mistral'}
              </button>
            ))}
          </div>
          <p className="text-xs text-ui-gray font-mono">
            Sets the default provider for AI search. You can still switch it in the AI screen.
          </p>
        </div>

        <div className="space-y-4 border-t border-dark-border pt-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest">API Key Storage</h3>
            <p className="text-xs text-ui-gray font-mono leading-relaxed">
              Session-only keeps keys for the current app session. Secure remember saves encrypted keys that you unlock with a passphrase on each launch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {([
              {
                value: 'session',
                title: 'Session-only',
                description: 'Keys clear after a full reload or reopen.',
              },
              {
                value: 'encrypted',
                title: 'Secure remember',
                description: 'Save encrypted keys on this device and unlock them with a passphrase.',
              },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('apiKeyPersistenceMode', option.value)}
                className={`press-feedback text-left border p-4 transition-colors ${
                  settings.apiKeyPersistenceMode === option.value
                    ? 'border-white bg-white text-black'
                    : 'border-dark-border text-white hover:border-white/40'
                }`}
                aria-pressed={settings.apiKeyPersistenceMode === option.value}
              >
                <p className="text-xs font-mono uppercase tracking-[0.2em]">{option.title}</p>
                <p className={`mt-2 text-xs leading-relaxed ${
                  settings.apiKeyPersistenceMode === option.value ? 'text-black/75' : 'text-ui-gray'
                }`}>
                  {option.description}
                </p>
              </button>
            ))}
          </div>

          {settings.apiKeyPersistenceMode === 'encrypted' && (
            <div className="border border-dark-border p-4 space-y-4">
              <div className="space-y-1">
                <p className="mono-label text-white">Secure remember</p>
                <p className="text-xs text-ui-gray leading-relaxed">
                  Saved keys stay encrypted until you unlock them for the current session.
                </p>
              </div>

              {hasEncryptedApiKeys && isVaultLocked && (
                <div className="space-y-3 border border-dark-border p-4">
                  <div className="space-y-1">
                    <p className="mono-label text-white">Unlock saved keys</p>
                    <p className="text-xs text-ui-gray leading-relaxed">
                      Unlock your remembered keys to use or edit them in this session.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={unlockPassphrase}
                      onChange={(event) => setUnlockPassphrase(event.target.value)}
                      className="utilitarian-input mobile-form-control-inline w-full font-mono"
                      placeholder="Enter passphrase"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      className="utilitarian-button px-4 sm:min-w-[9rem] disabled:opacity-60"
                    >
                      {isUnlocking ? 'Unlocking…' : 'Unlock'}
                    </button>
                  </div>
                  {unlockError ? <p className="text-xs font-mono text-accent-red">{unlockError}</p> : null}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="mono-label">Passphrase</label>
                  <input
                    type="password"
                    value={securePassphrase}
                    onChange={(event) => setSecurePassphrase(event.target.value)}
                    className="utilitarian-input mobile-form-control-inline w-full font-mono"
                    placeholder={hasEncryptedApiKeys ? 'Only needed to update saved keys' : 'Create a passphrase'}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1">
                  <label className="mono-label">Confirm Passphrase</label>
                  <input
                    type="password"
                    value={securePassphraseConfirm}
                    onChange={(event) => setSecurePassphraseConfirm(event.target.value)}
                    className="utilitarian-input mobile-form-control-inline w-full font-mono"
                    placeholder="Confirm passphrase"
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </div>
              </div>
              <p className="text-xs text-ui-gray font-mono leading-relaxed">
                Needed when you first save remembered keys, or when you update them later.
              </p>

              {hasEncryptedApiKeys && (
                <button
                  type="button"
                  onClick={handleForgetSavedKeys}
                  disabled={isForgettingKeys}
                  className="utilitarian-button w-full sm:w-auto px-4 py-3 text-xs font-mono uppercase tracking-widest disabled:opacity-60"
                >
                  {isForgettingKeys ? 'Forgetting Saved Keys…' : 'Forget Saved Keys'}
                </button>
              )}
            </div>
          )}
        </div>

        <CollapsibleSection
          title="Gemini API Key"
          hint={
            settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked
              ? 'Unlock required'
              : geminiApiKey
                ? 'Key configured'
                : 'Not configured'
          }
        >
          <p className="text-xs font-mono text-ui-gray leading-relaxed">
            Use Gemini if you want the current Google-based recipe lookup flow.
          </p>
          <div className="space-y-1">
            <label className="mono-label">Gemini Key</label>
            <div className="flex gap-2">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="utilitarian-input mobile-form-control-inline w-full font-mono"
                placeholder={
                  settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked
                    ? 'Unlock saved keys to view or edit'
                    : 'AIza...'
                }
                autoComplete="off"
                spellCheck={false}
                disabled={settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked}
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((v) => !v)}
                disabled={settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked}
                className="utilitarian-button px-4 flex items-center justify-center min-w-[44px]"
                aria-label={showGeminiKey ? 'Hide Gemini key' : 'Show Gemini key'}
              >
                {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-red hover:underline text-xs font-mono"
          >
            Open Google AI Studio <ExternalLink size={10} />
          </a>
        </CollapsibleSection>

        <CollapsibleSection
          title="Mistral API Key"
          hint={
            settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked
              ? 'Unlock required'
              : mistralApiKey
                ? 'Key configured'
                : 'Not configured'
          }
        >
          <p className="text-xs font-mono text-ui-gray leading-relaxed">
            Use Mistral with built-in web search to look up recent film recipes with `mistral-small-latest`.
          </p>
          <div className="space-y-1">
            <label className="mono-label">Mistral Key</label>
            <div className="flex gap-2">
              <input
                type={showMistralKey ? 'text' : 'password'}
                value={mistralApiKey}
                onChange={(e) => setMistralApiKey(e.target.value)}
                className="utilitarian-input mobile-form-control-inline w-full font-mono"
                placeholder={
                  settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked
                    ? 'Unlock saved keys to view or edit'
                    : '...'
                }
                autoComplete="off"
                spellCheck={false}
                disabled={settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked}
              />
              <button
                type="button"
                onClick={() => setShowMistralKey((v) => !v)}
                disabled={settings.apiKeyPersistenceMode === 'encrypted' && hasEncryptedApiKeys && isVaultLocked}
                className="utilitarian-button px-4 flex items-center justify-center min-w-[44px]"
                aria-label={showMistralKey ? 'Hide Mistral key' : 'Show Mistral key'}
              >
                {showMistralKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <a
            href="https://console.mistral.ai/api-keys/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-red hover:underline text-xs font-mono"
          >
            Open Mistral API Keys <ExternalLink size={10} />
          </a>
        </CollapsibleSection>

        <div className="flex items-start gap-3 border border-dark-border p-4 mt-4">
          <Shield size={14} className="text-ui-gray mt-0.5 shrink-0" />
          <p className="text-xs text-ui-gray font-mono leading-relaxed">
            Requests still go directly from your browser to Google or Mistral. Session-only keys are not stored. Remembered keys are stored encrypted.
          </p>
        </div>

        <div className="border-t border-dark-border pt-6 space-y-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isSavingSettings}
            className="w-full utilitarian-button bg-white text-black font-bold py-4 hover:bg-accent-red hover:text-white hover:border-accent-red flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            <Save size={18} />
            <span>{isSaving ? 'Saving API Keys…' : isSavingSettings ? 'Saving Settings…' : 'Save API Keys'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold uppercase tracking-tight">Notifications</h2>
          <p className="text-xs text-ui-gray font-mono uppercase tracking-widest">Agitation alerts and phase-end events</p>
        </div>

        {!notificationsSupported() ? (
          <p className="text-xs text-ui-gray font-mono">Notifications are not supported in this browser.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="mono-label cursor-pointer" htmlFor="notif-toggle">Enable notifications</label>
              <button
                id="notif-toggle"
                type="button"
                onClick={() => handleChange('notificationsEnabled', !settings.notificationsEnabled)}
                disabled={permissionStatus !== 'granted'}
                className={`press-feedback relative inline-flex h-6 w-11 items-center border transition-colors focus:outline-none ${
                  settings.notificationsEnabled && permissionStatus === 'granted'
                    ? 'bg-accent-red border-accent-red'
                    : 'bg-transparent border-dark-border'
                } disabled:opacity-40`}
                aria-checked={settings.notificationsEnabled}
                aria-label="Enable notifications"
                role="switch"
              >
                <span className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                  settings.notificationsEnabled && permissionStatus === 'granted' ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {permissionStatus !== 'granted' && (
              <div className="space-y-3">
                <p className="text-xs text-ui-gray font-mono leading-relaxed">
                  {permissionStatus === 'denied'
                    ? 'Notification permission was denied. Enable it in your browser site settings.'
                    : 'Grant permission to receive agitation and phase-end alerts.'}
                </p>
                {permissionStatus !== 'denied' && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="utilitarian-button flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest"
                  >
                    <Bell size={14} />
                    Grant Permission
                  </button>
                )}
              </div>
            )}

            {permissionStatus === 'granted' && (
              <p className="text-xs text-ui-gray font-mono">
                Permission granted. Toggle notifications above to enable alerts during timer sessions.
              </p>
            )}

            <div className="space-y-3 border-t border-dark-border pt-4">
              <p className="text-sm font-bold uppercase tracking-widest">Agitation cues</p>
              <PreferenceToggle
                checked={settings.agitationFlashEnabled}
                label="Flash overlay"
                description="Pulse the active timer with a restrained red flash during agitation windows."
                onToggle={() => handleChange('agitationFlashEnabled', !settings.agitationFlashEnabled)}
              />
              <PreferenceToggle
                checked={settings.agitationVibrationEnabled}
                disabled={!vibrationSupported}
                label="Vibration cues"
                description={
                  vibrationSupported
                    ? 'Use a short double pulse when agitation starts on supported mobile browsers.'
                    : 'Vibration is not supported on this device or browser.'
                }
                onToggle={() => handleChange('agitationVibrationEnabled', !settings.agitationVibrationEnabled)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold uppercase tracking-tight">History & Data</h2>
          <p className="text-xs text-ui-gray font-mono uppercase tracking-widest">
            Manage the local timer sessions saved on this device
          </p>
        </div>

        <div className="border border-dark-border p-4 space-y-4">
          <div className="space-y-1">
            <p className="mono-label text-white">Saved sessions</p>
            <p className="text-xs text-ui-gray leading-relaxed">
              {sessionCount === 0
                ? 'No session history is saved right now.'
                : `${sessionCount} session${sessionCount === 1 ? '' : 's'} saved locally in DarkTimer history.`}
            </p>
          </div>

          {confirmClearHistory ? (
            <div className="space-y-3 border border-accent-red/30 bg-accent-red/5 p-4">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-accent-red">
                Clear all saved session history?
              </p>
              <p className="text-xs leading-relaxed text-ui-gray">
                This only removes the history log. Your presets, settings, and API key storage stay untouched.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleClearHistory()}
                  disabled={isClearingHistory}
                  className="utilitarian-button border-accent-red bg-accent-red px-4 py-3 text-xs font-mono uppercase tracking-widest text-white disabled:opacity-60"
                >
                  {isClearingHistory ? 'Clearing History…' : 'Yes, Clear History'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearHistory(false)}
                  disabled={isClearingHistory}
                  className="utilitarian-button px-4 py-3 text-xs font-mono uppercase tracking-widest disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setHistoryError('');
                setConfirmClearHistory(true);
              }}
              disabled={sessionCount === 0}
              className="utilitarian-button w-full sm:w-auto px-4 py-3 text-xs font-mono uppercase tracking-widest disabled:opacity-40"
            >
              Clear History
            </button>
          )}

          {historyError ? <p className="text-xs font-mono text-accent-red">{historyError}</p> : null}
        </div>
      </div>

      {settingsError ? <p className="text-xs font-mono text-accent-red">{settingsError}</p> : null}
      {saveError ? <p className="text-xs font-mono text-accent-red">{saveError}</p> : null}

    </div>
  );
};
