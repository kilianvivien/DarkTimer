import React, { useState } from 'react';
import { Save, Eye, EyeOff, ExternalLink, Shield, Bell } from 'lucide-react';
import {
  AIProvider,
  UserSettings,
  getGeminiApiKey,
  getMistralApiKey,
  getSettings,
  saveGeminiApiKey,
  saveMistralApiKey,
  saveSettings,
} from '../services/settings';
import { notificationsSupported, notificationPermission, requestNotificationPermission } from '../services/notifications';

interface SettingsMenuProps {
  onSave: () => void;
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
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={mins}
            onChange={(e) => updatePart('min', parseInt(e.target.value) || 0)}
            className="utilitarian-input w-20 text-center"
            min="0"
          />
          <span className="text-[10px] font-mono text-ui-gray uppercase">m</span>
        </div>
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={secs}
            onChange={(e) => updatePart('sec', parseInt(e.target.value) || 0)}
            className="utilitarian-input w-20 text-center"
            min="0"
            max="59"
          />
          <span className="text-[10px] font-mono text-ui-gray uppercase">s</span>
        </div>
      </div>
    </div>
  );
};

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [geminiApiKey, setGeminiApiKey] = useState(getGeminiApiKey());
  const [mistralApiKey, setMistralApiKey] = useState(getMistralApiKey());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(notificationPermission());

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    saveGeminiApiKey(geminiApiKey.trim());
    saveMistralApiKey(mistralApiKey.trim());
    onSave();
    alert('Settings saved');
  };

  return (
    <form onSubmit={handleSave} className="w-full max-w-xl space-y-8">

      {/* Development settings */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-8">
        <div className="space-y-1">
          <h2 className="text-xl font-bold uppercase tracking-tight">Development Settings</h2>
          <p className="text-[9px] text-ui-gray font-mono uppercase tracking-widest">
            Default chemistry timings and process temperatures
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        <div className="space-y-6 pt-8 border-t border-dark-border">
          <h3 className="text-sm font-bold uppercase tracking-widest">Process Temperatures (°C)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="mono-label">Black &amp; White</label>
              <input
                type="number"
                value={settings.defaultBwTempC}
                onChange={(e) => handleChange('defaultBwTempC', parseFloat(e.target.value) || 0)}
                className="utilitarian-input w-full"
                step="0.5"
              />
              <p className="text-xs text-ui-gray font-mono mt-1">Used when Manual or AI mode is set to Black &amp; White.</p>
            </div>
            <div className="space-y-1">
              <label className="mono-label">Color Negative &amp; Slide</label>
              <input
                type="number"
                value={settings.defaultColorTempC}
                onChange={(e) => handleChange('defaultColorTempC', parseFloat(e.target.value) || 0)}
                className="utilitarian-input w-full"
                step="0.5"
              />
              <p className="text-xs text-ui-gray font-mono mt-1">Used when Manual or AI mode is set to Color Negative &amp; Slide.</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI settings */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold uppercase tracking-tight">AI Settings</h2>
          <p className="text-[9px] text-ui-gray font-mono uppercase tracking-widest">
            Provider selection and API keys for recipe search
          </p>
        </div>

        <div className="space-y-2">
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

        <div className="space-y-4 border border-dark-border p-4">
          <div className="space-y-1">
            <p className="text-white uppercase tracking-widest text-[9px]">Gemini API Key</p>
            <p className="text-xs font-mono text-ui-gray leading-relaxed">
              Use Gemini if you want the current Google-based recipe lookup flow.
            </p>
          </div>
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
                className="utilitarian-button px-3 flex items-center"
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
        </div>

        <div className="space-y-4 border border-dark-border p-4">
          <div className="space-y-1">
            <p className="text-white uppercase tracking-widest text-[9px]">Mistral API Key</p>
            <p className="text-xs font-mono text-ui-gray leading-relaxed">
              Use Mistral with built-in web search to look up recent film recipes with `mistral-small-latest`.
            </p>
          </div>
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
                className="utilitarian-button px-3 flex items-center"
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
        </div>

        <div className="flex items-start gap-2 border border-dark-border p-3">
          <Shield size={12} className="text-ui-gray mt-0.5 shrink-0" />
          <p className="text-[9px] text-ui-gray font-mono leading-relaxed">
            Your keys are stored only in this browser&apos;s localStorage and are never sent to any server. API calls go directly from your browser to Google or Mistral. Clearing your browser data will remove them.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold uppercase tracking-tight">Notifications</h2>
          <p className="text-[9px] text-ui-gray font-mono uppercase tracking-widest">Agitation alerts and phase-end events</p>
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.notificationsEnabled && permissionStatus === 'granted'
                    ? 'bg-accent-red'
                    : 'bg-dark-border'
                } disabled:opacity-40`}
                aria-checked={settings.notificationsEnabled}
                role="switch"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full utilitarian-button bg-white text-black font-bold py-4 hover:bg-accent-red hover:text-white hover:border-accent-red flex items-center justify-center space-x-2"
      >
        <Save size={18} />
        <span>Save Settings</span>
      </button>
    </form>
  );
};
