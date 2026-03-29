import React, { useState } from 'react';
import { Save, Eye, EyeOff, ExternalLink, Shield, Bell } from 'lucide-react';
import { UserSettings, getSettings, saveSettings, getGeminiApiKey, saveGeminiApiKey } from '../services/settings';
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
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [showKey, setShowKey] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(notificationPermission());

  const handleChange = (field: keyof UserSettings, value: number | boolean) => {
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
    saveGeminiApiKey(apiKey.trim());
    onSave();
    alert('Settings saved');
  };

  return (
    <form onSubmit={handleSave} className="w-full max-w-xl space-y-8">

      {/* Timer defaults */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">Default Durations</h2>
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
          <h2 className="text-xl font-bold uppercase tracking-tight">Process Defaults (°C)</h2>
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

      {/* Gemini API Key — separate card */}
      <div className="utilitarian-border bg-dark-panel p-5 md:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold uppercase tracking-tight">Gemini API Key</h2>
          <p className="text-[9px] text-ui-gray font-mono uppercase tracking-widest">Required for the AI Assistant</p>
        </div>

        <div className="space-y-3 text-xs font-mono text-ui-gray leading-relaxed border border-dark-border p-4">
          <p className="text-white uppercase tracking-widest text-[9px]">How to get a key</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Go to Google AI Studio</li>
            <li>Sign in with your Google account</li>
            <li>Click <span className="text-white">Get API key</span> {'→'} <span className="text-white">Create API key</span></li>
            <li>Copy and paste it below</li>
          </ol>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-red hover:underline mt-1"
          >
            Open Google AI Studio <ExternalLink size={10} />
          </a>
        </div>

        <div className="space-y-1">
          <label className="mono-label">API Key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="utilitarian-input w-full font-mono"
              placeholder="AIza..."
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="utilitarian-button px-3 flex items-center"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 border border-dark-border p-3">
          <Shield size={12} className="text-ui-gray mt-0.5 shrink-0" />
          <p className="text-[9px] text-ui-gray font-mono leading-relaxed">
            Your key is stored only in this browser's localStorage and is never sent to any server. API calls go directly from your browser to Google. Clearing your browser data will remove it.
          </p>
        </div>
      </div>

      {/* Notifications — separate card */}
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
        <span>Save Defaults</span>
      </button>
    </form>
  );
};
