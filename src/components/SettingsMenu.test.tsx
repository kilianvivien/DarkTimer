import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsMenu } from './SettingsMenu';
import { DEFAULT_SETTINGS } from '../services/userSettings';

describe('SettingsMenu', () => {
  it('requires a passphrase before saving encrypted keys', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsMenu
        apiKeys={{ gemini: '', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onForgetSavedKeys={vi.fn().mockResolvedValue(undefined)}
        onSave={onSave}
        onUnlockSavedKeys={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /secure remember/i }));
    await user.click(screen.getByRole('button', { name: /gemini api key/i }));
    await user.type(screen.getByPlaceholderText('AIza...'), ' gemini-key ');
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText('Enter a passphrase to securely remember your API keys on this device.'),
    ).toBeInTheDocument();
  });

  it('validates passphrase confirmation before save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsMenu
        apiKeys={{ gemini: '', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onForgetSavedKeys={vi.fn().mockResolvedValue(undefined)}
        onSave={onSave}
        onUnlockSavedKeys={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /secure remember/i }));
    await user.type(screen.getByPlaceholderText('Create a passphrase'), 'darkroom');
    await user.type(screen.getByPlaceholderText('Confirm passphrase'), 'different');
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Passphrase confirmation does not match.')).toBeInTheDocument();
  });

  it('requests notification permission and enables the toggle', async () => {
    const user = userEvent.setup();

    render(
      <SettingsMenu
        apiKeys={{ gemini: '', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onForgetSavedKeys={vi.fn().mockResolvedValue(undefined)}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onUnlockSavedKeys={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    const notificationMock = window.Notification as unknown as {
      permission: NotificationPermission;
      requestPermission: ReturnType<typeof vi.fn>;
    };
    notificationMock.permission = 'granted';
    notificationMock.requestPermission.mockResolvedValueOnce('granted');

    await user.click(screen.getByRole('button', { name: /grant permission/i }));

    expect(notificationMock.requestPermission).toHaveBeenCalled();
    expect(screen.getByText(/permission granted/i)).toBeInTheDocument();
  });

  it('unlocks and forgets saved keys when the vault is locked', async () => {
    const user = userEvent.setup();
    const onUnlockSavedKeys = vi.fn().mockResolvedValue(undefined);
    const onForgetSavedKeys = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsMenu
        apiKeys={{ gemini: '', mistral: '' }}
        hasEncryptedApiKeys={true}
        isVaultLocked={true}
        onForgetSavedKeys={onForgetSavedKeys}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onUnlockSavedKeys={onUnlockSavedKeys}
        settings={{ ...DEFAULT_SETTINGS, apiKeyPersistenceMode: 'encrypted' }}
      />,
    );

    await user.type(screen.getByPlaceholderText('Enter passphrase'), 'darkroom');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(onUnlockSavedKeys).toHaveBeenCalledWith('darkroom');

    await user.click(screen.getByRole('button', { name: /forget saved keys/i }));
    expect(onForgetSavedKeys).toHaveBeenCalledWith(
      expect.objectContaining({ apiKeyPersistenceMode: 'session' }),
    );
  });
});
