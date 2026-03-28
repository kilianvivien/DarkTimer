import React, { useState } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { UserSettings, getSettings, saveSettings, getGeminiApiKey, saveGeminiApiKey } from '../services/settings';

interface SettingsMenuProps {
  onSave: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [showKey, setShowKey] = useState(false);

  const handleChange = (field: keyof UserSettings, value: number) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    saveGeminiApiKey(apiKey.trim());
    onSave();
    alert('Settings saved');
  };

  return (
    <form onSubmit={handleSave} className="w-full max-w-xl space-y-8 utilitarian-border p-8 bg-dark-panel">
      <div className="space-y-6">
        <h2 className="text-xl font-bold uppercase tracking-tight">Default Durations (sec)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="mono-label">Stop Bath</label>
            <input
              type="number"
              value={settings.defaultStopBath}
              onChange={(e) => handleChange('defaultStopBath', parseInt(e.target.value) || 0)}
              className="utilitarian-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="mono-label">Fixer</label>
            <input
              type="number"
              value={settings.defaultFixer}
              onChange={(e) => handleChange('defaultFixer', parseInt(e.target.value) || 0)}
              className="utilitarian-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="mono-label">Wash</label>
            <input
              type="number"
              value={settings.defaultWash}
              onChange={(e) => handleChange('defaultWash', parseInt(e.target.value) || 0)}
              className="utilitarian-input w-full"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-dark-border">
        <h2 className="text-xl font-bold uppercase tracking-tight">Agitation Cycle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="mono-label">Duration (sec)</label>
            <input
              type="number"
              value={settings.agitationDuration}
              onChange={(e) => handleChange('agitationDuration', parseInt(e.target.value) || 0)}
              className="utilitarian-input w-full"
              placeholder="e.g. 5"
            />
            <p className="text-[8px] text-ui-gray font-mono mt-1">How long to agitate for</p>
          </div>
          <div className="space-y-1">
            <label className="mono-label">Interval (sec)</label>
            <input
              type="number"
              value={settings.agitationInterval}
              onChange={(e) => handleChange('agitationInterval', parseInt(e.target.value) || 0)}
              className="utilitarian-input w-full"
              placeholder="e.g. 60"
            />
            <p className="text-[8px] text-ui-gray font-mono mt-1">Frequency of agitation</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-dark-border">
        <h2 className="text-xl font-bold uppercase tracking-tight">Gemini API Key</h2>
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
          <p className="text-[8px] text-ui-gray font-mono mt-1">Stored locally in your browser. Overrides any build-time key.</p>
        </div>
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
