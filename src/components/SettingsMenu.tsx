import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { UserSettings, getSettings, saveSettings } from '../services/settings';

interface SettingsMenuProps {
  onSave: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());

  const handleChange = (field: keyof UserSettings, value: number) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
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
