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

describe('SettingsMenu', () => {
  it('requires a passphrase before saving encrypted keys', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({ onSave });

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

    await user.click(screen.getByRole('button', { name: /black & white/i }));
    await user.click(screen.getByRole('button', { name: /secure remember/i }));

    expect(screen.getByPlaceholderText('Create a passphrase')).toHaveClass('mobile-form-control-inline');
    expect(screen.getByDisplayValue(String(DEFAULT_SETTINGS.defaultBwTempC))).toHaveClass(
      'mobile-form-control-inline',
    );
  });

  it('exposes collapsible sections and switches with accessible state and names', () => {
    renderSettingsMenu();

    expect(screen.getByRole('button', { name: /black & white/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /color negative & slide/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('switch', { name: /enable notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /flash overlay/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /vibration cues/i })).toBeInTheDocument();
  });

  it('disables clear history when there are no saved sessions', () => {
    renderSettingsMenu();

    expect(screen.getByRole('button', { name: /clear history/i })).toBeDisabled();
  });

  it('requires confirmation before clearing session history', async () => {
    const user = userEvent.setup();
    const onClearHistory = vi.fn().mockResolvedValue(undefined);

    renderSettingsMenu({ onClearHistory, sessionCount: 3 });

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

    await user.click(screen.getByRole('button', { name: /color negative & slide/i }));
    await user.click(screen.getByRole('button', { name: /no delay/i }));

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ phaseCountdown: 0 }),
    );
  });
});
