import React, { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, ExternalLink, Shield, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AIProvider,
  PhaseCountdown,
  UserSettings,
} from '../services/settings';
import { notificationsSupported, notificationPermission, requestNotificationPermission } from '../services/notifications';

interface SettingsMenuProps {
  apiKeys: Record<AIProvider, string>;
  onSave: (settings: UserSettings, apiKeys: Record<AIProvider, string>) => Promise<void>;
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
            className="utilitarian-input flex-1 min-w-0 text-center"
            min="0"
          />
          <span className="text-[10px] font-mono text-ui-gray uppercase shrink-0">m</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <input
            type="number"
            value={secs}
            onChange={(e) => updatePart('sec', parseInt(e.target.value) || 0)}
            className="utilitarian-input flex-1 min-w-0 text-center"
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
  return (
    <div className="border-t border-dark-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left group"
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
  return (
    <div className="flex items-start justify-between gap-4 border border-dark-border p-4">
      <div className="space-y-1 min-w-0">
        <p className="mono-label text-white">{label}</p>
        <p className="text-xs text-ui-gray leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center border transition-colors focus:outline-none ${
          checked ? 'bg-accent-red border-accent-red' : 'bg-transparent border-dark-border'
        } disabled:opacity-40`}
        aria-checked={checked}
        role="switch"
      >
        <span className={`inline-block h-4 w-4 transform bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
};

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ apiKeys, onSave, settings: initialSettings }) => {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [geminiApiKey, setGeminiApiKey] = useState(apiKeys.gemini);
  const [mistralApiKey, setMistralApiKey] = useState(apiKeys.mistral);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(notificationPermission());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const vibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    setGeminiApiKey(apiKeys.gemini);
    setMistralApiKey(apiKeys.mistral);
  }, [apiKeys.gemini, apiKeys.mistral]);

  const handleChange = <K extends keyof UserSettings>(field: K, value: UserSettings[K]) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermissionStatus(result);
    if (result === 'granted') {
      setSettings(s => ({ ...s, notificationsEnabled: true }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');

    try {
      await onSave(settings, {
        gemini: geminiApiKey,
        mistral: mistralApiKey,
      });
    } catch (error) {
      setSaveError('Settings could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="w-full max-w-xl space-y-8">

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
          defaultOpen={true}
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
              className="utilitarian-input w-full md:w-40"
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
              className="utilitarian-input w-full md:w-40"
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
                className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  i < 2 ? 'border-r border-dark-border' : ''
                } ${
                  settings.phaseCountdown === val
                    ? 'bg-white text-black'
                    : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]'
                }`}
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
              >
                {provider === 'gemini' ? 'Gemini' : 'Mistral'}
              </button>
            ))}
          </div>
          <p className="text-xs text-ui-gray font-mono">
            This sets the default provider used when you open AI search. You can still switch providers directly in the AI screen.
          </p>
        </div>

        <CollapsibleSection
          title="Gemini API Key"
          hint={geminiApiKey ? 'Key configured' : 'Not configured'}
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
                className="utilitarian-input w-full font-mono"
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((v) => !v)}
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
          hint={mistralApiKey ? 'Key configured' : 'Not configured'}
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
                className="utilitarian-input w-full font-mono"
                placeholder="..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowMistralKey((v) => !v)}
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
            Your keys are stored only on this device in DarkTimer&apos;s local IndexedDB storage and are never sent to any server you do not explicitly call. API requests still go directly from your browser to Google or Mistral.
          </p>
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
                className={`relative inline-flex h-6 w-11 items-center border transition-colors focus:outline-none ${
                  settings.notificationsEnabled && permissionStatus === 'granted'
                    ? 'bg-accent-red border-accent-red'
                    : 'bg-transparent border-dark-border'
                } disabled:opacity-40`}
                aria-checked={settings.notificationsEnabled}
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

      {saveError ? <p className="text-xs font-mono text-accent-red">{saveError}</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full utilitarian-button bg-white text-black font-bold py-4 hover:bg-accent-red hover:text-white hover:border-accent-red flex items-center justify-center space-x-2 disabled:opacity-60"
      >
        <Save size={18} />
        <span>{isSaving ? 'Saving Settings…' : 'Save Settings'}</span>
      </button>
    </form>
  );
};
