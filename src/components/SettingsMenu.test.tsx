import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsMenu } from './SettingsMenu';
import { DEFAULT_SETTINGS } from '../services/userSettings';

function renderSettingsMenu(overrides: Partial<ComponentProps<typeof SettingsMenu>> = {}) {
  return render(
    <SettingsMenu
      apiKeys={{ gemini: '', mistral: '' }}
      hasEncryptedApiKeys={false}
      isVaultLocked={false}
      onClearHistory={vi.fn().mockResolvedValue(undefined)}
      onClearAllData={vi.fn().mockResolvedValue(undefined)}
      onForgetSavedKeys={vi.fn().mockResolvedValue(undefined)}
      onSettingsChange={vi.fn().mockResolvedValue(undefined)}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onUnlockSavedKeys={vi.fn().mockResolvedValue(undefined)}
      sessionCount={0}
      settings={DEFAULT_SETTINGS}
      {...overrides}
    />,
  );
}

async function openCategory(
  user: ReturnType<typeof userEvent.setup>,
  name: RegExp,
) {
  await user.click(screen.getByRole('button', { name }));
}

describe('SettingsMenu', () => {
  it('starts with a category index and opens one focused settings view at a time', async () => {
    const user = userEvent.setup();

    renderSettingsMenu();

    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /settings categories/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /settings categories/i })).toHaveClass('md:grid-cols-2');
    expect(screen.getByRole('button', { name: /^development/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^display/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ai & api keys/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^alerts & cues/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^history & data/i })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /yolo run/i })).not.toBeInTheDocument();

    await openCategory(user, /^development/i);

    expect(screen.getByRole('heading', { name: 'Development', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to settings/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /yolo run/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^display/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to settings/i }));
    expect(screen.getByRole('navigation', { name: /settings categories/i })).toBeInTheDocument();
  });

  it('requires a passphrase before saving encrypted keys', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({ onSave });

    await openCategory(user, /^ai & api keys/i);
    await user.click(screen.getByRole('button', { name: /secure remember/i }));
    await user.click(screen.getByRole('button', { name: /gemini api key/i }));
    await user.type(screen.getByPlaceholderText('AIza...'), ' gemini-key ');
    await user.click(screen.getByRole('button', { name: /save api keys/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText('Enter a passphrase to securely remember your API keys on this device.'),
    ).toBeInTheDocument();
  });

  it('validates passphrase confirmation before save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({ onSave });

    await openCategory(user, /^ai & api keys/i);
    await user.click(screen.getByRole('button', { name: /secure remember/i }));
    await user.type(screen.getByPlaceholderText('Create a passphrase'), 'darkroom');
    await user.type(screen.getByPlaceholderText('Confirm passphrase'), 'different');
    await user.click(screen.getByRole('button', { name: /save api keys/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Passphrase confirmation does not match.')).toBeInTheDocument();
  });

  it('requests notification permission and enables the toggle', async () => {
    const user = userEvent.setup();

    const onSettingsChange = vi.fn().mockResolvedValue(undefined);
    renderSettingsMenu({ onSettingsChange });

    const notificationMock = window.Notification as unknown as {
      permission: NotificationPermission;
      requestPermission: ReturnType<typeof vi.fn>;
    };
    notificationMock.permission = 'granted';
    notificationMock.requestPermission.mockResolvedValueOnce('granted');

    await openCategory(user, /^alerts & cues/i);
    await user.click(screen.getByRole('button', { name: /grant permission/i }));

    expect(notificationMock.requestPermission).toHaveBeenCalled();
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ notificationsEnabled: true }),
    );
    expect(screen.getByText(/permission granted/i)).toBeInTheDocument();
  });

  it('unlocks and forgets saved keys when the vault is locked', async () => {
    const user = userEvent.setup();
    const onUnlockSavedKeys = vi.fn().mockResolvedValue(undefined);
    const onForgetSavedKeys = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({
      hasEncryptedApiKeys: true,
      isVaultLocked: true,
      onForgetSavedKeys,
      onUnlockSavedKeys,
      settings: { ...DEFAULT_SETTINGS, apiKeyPersistenceMode: 'encrypted' },
    });

    await openCategory(user, /^ai & api keys/i);
    await user.type(screen.getByPlaceholderText('Enter passphrase'), 'darkroom');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(onUnlockSavedKeys).toHaveBeenCalledWith('darkroom');

    await user.click(screen.getByRole('button', { name: /forget saved keys/i }));
    expect(onForgetSavedKeys).toHaveBeenCalledWith(
      expect.objectContaining({ apiKeyPersistenceMode: 'session' }),
    );
  });

  it('renders settings inputs with mobile-safe sizing classes', async () => {
    const user = userEvent.setup();

    renderSettingsMenu();

    await openCategory(user, /^development/i);
    await user.click(screen.getByRole('button', { name: /black & white/i }));
    expect(screen.getByDisplayValue(String(DEFAULT_SETTINGS.defaultBwTempC))).toHaveClass(
      'mobile-form-control-inline',
    );

    await user.click(screen.getByRole('button', { name: /back to settings/i }));
    await openCategory(user, /^ai & api keys/i);
    await user.click(screen.getByRole('button', { name: /secure remember/i }));

    expect(screen.getByPlaceholderText('Create a passphrase')).toHaveClass('mobile-form-control-inline');
  });

  it('exposes detailed controls with accessible state and names', async () => {
    const user = userEvent.setup();
    renderSettingsMenu();

    await openCategory(user, /^development/i);
    expect(screen.getByRole('button', { name: /black & white/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /color negative & slide/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('switch', { name: /yolo run/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to settings/i }));
    await openCategory(user, /^alerts & cues/i);
    expect(screen.getByRole('switch', { name: /enable notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /vibration cues/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full flash/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^border$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('slider', { name: /cue volume/i })).toBeInTheDocument();
  });

  it('disables clear history when there are no saved sessions', async () => {
    const user = userEvent.setup();
    renderSettingsMenu();

    await openCategory(user, /^history & data/i);
    expect(screen.getByRole('button', { name: /clear history/i })).toBeDisabled();
  });

  it('requires confirmation before clearing session history', async () => {
    const user = userEvent.setup();
    const onClearHistory = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({ onClearHistory, sessionCount: 3 });

    await openCategory(user, /^history & data/i);
    await user.click(screen.getByRole('button', { name: /^clear history$/i }));
    expect(screen.getByText(/clear all saved session history/i)).toBeInTheDocument();
    expect(onClearHistory).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /yes, clear history/i }));
    expect(onClearHistory).toHaveBeenCalledTimes(1);
  });

  it('auto-saves regular settings changes immediately', async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({ onSettingsChange });

    await openCategory(user, /^development/i);
    await user.click(screen.getByRole('button', { name: /color negative & slide/i }));
    await user.click(screen.getByRole('button', { name: /no delay/i }));

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ phaseCountdown: 0 }),
    );
  });

  it('toggles yolo run off by default and saves the new value immediately', async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({ onSettingsChange });

    await openCategory(user, /^development/i);
    const yoloRunToggle = screen.getByRole('switch', { name: /yolo run/i });
    expect(yoloRunToggle).toHaveAttribute('aria-checked', 'false');

    await user.click(yoloRunToggle);

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ yoloRun: true }),
    );
  });
});
