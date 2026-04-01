import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmSearch } from './FilmSearch';
import { DEFAULT_SETTINGS } from '../services/userSettings';
import { setOnlineStatus } from '../test/utils';

const getDevTimesMock = vi.fn();

vi.mock('../services/ai', () => ({
  getDevTimes: (...args: unknown[]) => getDevTimesMock(...args),
}));

describe('FilmSearch', () => {
  beforeEach(() => {
    getDevTimesMock.mockReset();
  });

  it('shows a missing-key warning before calling AI', async () => {
    const user = userEvent.setup();

    render(
      <FilmSearch
        apiKeys={{ gemini: '', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onOpenSettings={vi.fn()}
        onProviderChange={vi.fn().mockResolvedValue(undefined)}
        onRecipeFound={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    expect(screen.getByText('Gemini or Mistral API key required')).toBeInTheDocument();
    expect(getDevTimesMock).not.toHaveBeenCalled();
  });

  it('validates required film and developer inputs', async () => {
    const user = userEvent.setup();

    render(
      <FilmSearch
        apiKeys={{ gemini: 'test-key', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onOpenSettings={vi.fn()}
        onProviderChange={vi.fn().mockResolvedValue(undefined)}
        onRecipeFound={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    expect(screen.getAllByText('Enter at least a film and developer before asking AI.')).toHaveLength(2);
    expect(getDevTimesMock).not.toHaveBeenCalled();
  });

  it('reflects offline state without attempting a lookup', () => {
    setOnlineStatus(false);

    render(
      <FilmSearch
        apiKeys={{ gemini: 'test-key', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onOpenSettings={vi.fn()}
        onProviderChange={vi.fn().mockResolvedValue(undefined)}
        onRecipeFound={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask ai/i })).toBeDisabled();
  });

  it('renders representative controls with mobile-safe sizing classes', () => {
    render(
      <FilmSearch
        apiKeys={{ gemini: 'test-key', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onOpenSettings={vi.fn()}
        onProviderChange={vi.fn().mockResolvedValue(undefined)}
        onRecipeFound={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    expect(screen.getByDisplayValue(String(DEFAULT_SETTINGS.defaultBwTempC))).toHaveClass(
      'mobile-form-control-inline',
    );
    expect(screen.getByRole('combobox')).toHaveClass('mobile-form-control-compact');
  });

  it('renders successful AI results and supports select/save actions', async () => {
    const user = userEvent.setup();
    const onRecipeFound = vi.fn();
    const onSavePreset = vi.fn().mockResolvedValue(undefined);

    getDevTimesMock.mockResolvedValue({
      options: [
        {
          film: 'Tri-X',
          developer: 'Rodinal',
          dilution: '1+25',
          iso: 400,
          tempC: 20,
          processMode: 'bw',
          phases: [{ name: 'Developer', duration: 420, agitationMode: 'every-60s' }],
          notes: '',
          source: 'Massive Dev Chart',
        },
      ],
      confidence: 'high',
    });

    render(
      <FilmSearch
        apiKeys={{ gemini: 'test-key', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onOpenSettings={vi.fn()}
        onProviderChange={vi.fn().mockResolvedValue(undefined)}
        onRecipeFound={onRecipeFound}
        onSavePreset={onSavePreset}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.type(screen.getByPlaceholderText('e.g. Tri-X'), 'Tri-X');
    await user.type(screen.getByPlaceholderText('e.g. Rodinal'), 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() =>
      expect(screen.getByText(/gemini found 1 options/i)).toBeInTheDocument(),
    );
    expect(getDevTimesMock).toHaveBeenCalledWith(
      'gemini',
      'test-key',
      'Tri-X',
      'Rodinal',
      '400',
      DEFAULT_SETTINGS.defaultBwTempC,
      '',
      'bw',
    );

    await user.click(screen.getByRole('button', { name: /tri-x @ 400/i }));
    expect(onRecipeFound).toHaveBeenCalledWith(expect.objectContaining({ film: 'Tri-X' }));

    await user.click(screen.getByTitle('Save to Library'));
    expect(onSavePreset).toHaveBeenCalledWith(expect.objectContaining({ film: 'Tri-X' }));
  });

  it('pulls to retry the last query with the currently selected provider', async () => {
    const user = userEvent.setup();

    getDevTimesMock
      .mockResolvedValueOnce({
        options: [
          {
            film: 'Tri-X',
            developer: 'Rodinal',
            dilution: '1+25',
            iso: 400,
            tempC: 20,
            processMode: 'bw',
            phases: [{ name: 'Developer', duration: 420, agitationMode: 'every-60s' }],
            notes: '',
            source: 'Massive Dev Chart',
          },
        ],
        confidence: 'high',
      })
      .mockResolvedValueOnce({
        options: [
          {
            film: 'Tri-X',
            developer: 'XTOL',
            dilution: '1+1',
            iso: 400,
            tempC: 20,
            processMode: 'bw',
            phases: [{ name: 'Developer', duration: 360, agitationMode: 'every-60s' }],
            notes: '',
            source: 'Mistral Search',
          },
        ],
        confidence: 'high',
      });

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
    });

    render(
      <FilmSearch
        apiKeys={{ gemini: 'gemini-key', mistral: 'mistral-key' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onOpenSettings={vi.fn()}
        onProviderChange={vi.fn().mockResolvedValue(undefined)}
        onRecipeFound={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.type(screen.getByPlaceholderText('e.g. Tri-X'), 'Tri-X');
    await user.type(screen.getByPlaceholderText('e.g. Rodinal'), 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/gemini found 1 options/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /mistral/i }));

    const aiSearch = screen.getByLabelText(/ai search/i);
    fireEvent.touchStart(aiSearch, {
      touches: [{ clientX: 20, clientY: 20 }],
    });
    fireEvent.touchMove(aiSearch, {
      touches: [{ clientX: 25, clientY: 200 }],
    });
    fireEvent.touchEnd(aiSearch);

    await waitFor(() => {
      expect(getDevTimesMock).toHaveBeenNthCalledWith(
        2,
        'mistral',
        'mistral-key',
        'Tri-X',
        'Rodinal',
        '400',
        DEFAULT_SETTINGS.defaultBwTempC,
        '',
        'bw',
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/mistral found 1 options/i)).toBeInTheDocument();
    });
  });

  it('clears stale results on pull when offline instead of retrying', async () => {
    const user = userEvent.setup();

    getDevTimesMock.mockResolvedValueOnce({
      options: [
        {
          film: 'Tri-X',
          developer: 'Rodinal',
          dilution: '1+25',
          iso: 400,
          tempC: 20,
          processMode: 'bw',
          phases: [{ name: 'Developer', duration: 420, agitationMode: 'every-60s' }],
          notes: '',
          source: 'Massive Dev Chart',
        },
      ],
      confidence: 'high',
    });

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
    });

    render(
      <FilmSearch
        apiKeys={{ gemini: 'gemini-key', mistral: '' }}
        hasEncryptedApiKeys={false}
        isVaultLocked={false}
        onOpenSettings={vi.fn()}
        onProviderChange={vi.fn().mockResolvedValue(undefined)}
        onRecipeFound={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.type(screen.getByPlaceholderText('e.g. Tri-X'), 'Tri-X');
    await user.type(screen.getByPlaceholderText('e.g. Rodinal'), 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/gemini found 1 options/i)).toBeInTheDocument();
    });

    setOnlineStatus(false);
    window.dispatchEvent(new Event('offline'));

    const aiSearch = screen.getByLabelText(/ai search/i);
    fireEvent.touchStart(aiSearch, {
      touches: [{ clientX: 20, clientY: 20 }],
    });
    fireEvent.touchMove(aiSearch, {
      touches: [{ clientX: 25, clientY: 200 }],
    });
    fireEvent.touchEnd(aiSearch);

    await waitFor(() => {
      expect(screen.queryByText(/gemini found 1 options/i)).not.toBeInTheDocument();
    });
    expect(getDevTimesMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });
});
