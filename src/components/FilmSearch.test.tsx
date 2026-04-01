import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmSearch } from './FilmSearch';
import { DEFAULT_SETTINGS } from '../services/userSettings';
import { AIRecipeError } from '../services/aiErrors';
import type { DevRecipe } from '../services/recipe';
import { flushPromises, setOnlineStatus } from '../test/utils';

const getDevTimesMock = vi.fn();

vi.mock('../services/ai', () => ({
  getDevTimes: (...args: unknown[]) => getDevTimesMock(...args),
}));

function createRecipe(overrides: Partial<DevRecipe> = {}): DevRecipe {
  return {
    film: 'Tri-X 400',
    developer: 'Rodinal',
    dilution: '1+25',
    iso: 400,
    tempC: 20,
    processMode: 'bw',
    phases: [
      { name: 'Developer', duration: 420, agitationMode: 'every-60s' },
      { name: 'Stop Bath', duration: 30, agitationMode: 'stand' },
      { name: 'Fixer', duration: 300, agitationMode: 'every-60s' },
      { name: 'Wash', duration: 180, agitationMode: 'stand' },
    ],
    notes: 'Classic high-acutance recipe.',
    source: 'Massive Dev Chart',
    ...overrides,
  };
}

function renderFilmSearch(overrides: Partial<ComponentProps<typeof FilmSearch>> = {}) {
  const props: ComponentProps<typeof FilmSearch> = {
    apiKeys: { gemini: 'gemini-key', mistral: 'mistral-key' },
    hasEncryptedApiKeys: false,
    isVaultLocked: false,
    onOpenSettings: vi.fn(),
    onProviderChange: vi.fn().mockResolvedValue(undefined),
    onRecipeFound: vi.fn(),
    onSavePreset: vi.fn().mockResolvedValue(undefined),
    settings: DEFAULT_SETTINGS,
    ...overrides,
  };

  return {
    ...render(<FilmSearch {...props} />),
    props,
  };
}

async function fillCoreFields(user: ReturnType<typeof userEvent.setup>, film: string, developer: string) {
  await user.type(screen.getByRole('combobox', { name: /film stock/i }), film);
  await user.type(screen.getByRole('combobox', { name: /^developer$/i }), developer);
}

describe('FilmSearch', () => {
  beforeEach(() => {
    getDevTimesMock.mockReset();
    setOnlineStatus(true);
  });

  it('shows a missing-key warning before calling AI', async () => {
    const user = userEvent.setup();

    renderFilmSearch({
      apiKeys: { gemini: '', mistral: '' },
    });

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    expect(screen.getByText('Gemini or Mistral API key required')).toBeInTheDocument();
    expect(getDevTimesMock).not.toHaveBeenCalled();
  });

  it('disables submission until a film and developer are present', () => {
    renderFilmSearch();

    expect(screen.getByRole('button', { name: /ask ai/i })).toBeDisabled();
  });

  it('reflects offline state without attempting a lookup', () => {
    setOnlineStatus(false);

    renderFilmSearch();

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask ai/i })).toBeDisabled();
  });

  it('renders searchable inputs with shared manual-form styling', () => {
    renderFilmSearch();

    expect(screen.getByRole('combobox', { name: /film stock/i })).toHaveClass('utilitarian-input');
    expect(screen.getByRole('combobox', { name: /film stock/i })).toHaveClass('mobile-form-control-inline');
    expect(screen.getByRole('combobox', { name: /^developer$/i })).toHaveClass('utilitarian-input');
    expect(screen.getByRole('combobox', { name: /dilution/i })).toHaveClass('utilitarian-input');
    expect(screen.getByRole('combobox', { name: /^iso$/i })).toHaveClass('mobile-form-control-compact');
  });

  it('filters film suggestions by process mode', async () => {
    const user = userEvent.setup();

    renderFilmSearch();

    const filmInput = screen.getByRole('combobox', { name: /film stock/i });
    await user.click(filmInput);
    await user.type(filmInput, 'Portra');

    expect(screen.queryByRole('option', { name: 'Portra 400' })).not.toBeInTheDocument();
    expect(screen.getByText(/keep typing to use a custom value/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /color negative & slide/i }));
    await user.clear(filmInput);
    await user.type(filmInput, 'Portra');

    expect(screen.getByRole('option', { name: 'Portra 400' })).toBeInTheDocument();
  });

  it('supports free-text fallback submission', async () => {
    const user = userEvent.setup();

    getDevTimesMock.mockResolvedValue({
      options: [createRecipe({ film: 'Mystery 80', developer: 'Custom Soup' })],
      confidence: 'medium',
    });

    renderFilmSearch();

    await fillCoreFields(user, ' Mystery 80 ', ' Custom Soup ');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(getDevTimesMock).toHaveBeenCalledWith(
        'gemini',
        'gemini-key',
        'Mystery 80',
        'Custom Soup',
        '400',
        DEFAULT_SETTINGS.defaultBwTempC,
        '',
        'bw',
      );
    });
  });

  it('offers shared dilution suggestions', async () => {
    const user = userEvent.setup();

    renderFilmSearch();

    const dilutionInput = screen.getByRole('combobox', { name: /dilution/i });
    await user.click(dilutionInput);
    await user.type(dilutionInput, '1+');

    expect(screen.getByRole('option', { name: '1+1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1+25' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1+50' })).toBeInTheDocument();
  });

  it('renders successful AI results and supports start/save actions', async () => {
    const user = userEvent.setup();
    const onRecipeFound = vi.fn();
    const onSavePreset = vi.fn().mockResolvedValue(undefined);

    getDevTimesMock.mockResolvedValue({
      options: [createRecipe()],
      confidence: 'high',
    });

    renderFilmSearch({
      onRecipeFound,
      onSavePreset,
    });

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() =>
      expect(screen.getByText(/gemini found 1 option/i)).toBeInTheDocument(),
    );

    expect(screen.getByText('Classic high-acutance recipe.')).toBeInTheDocument();
    expect(screen.getByText(/15m 30s/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start timer/i }));
    expect(onRecipeFound).toHaveBeenCalledWith(expect.objectContaining({ film: 'Tri-X 400' }));

    await user.click(screen.getByRole('button', { name: /save to library/i }));
    expect(onSavePreset).toHaveBeenCalledWith(expect.objectContaining({ film: 'Tri-X 400' }));
  });

  it('retries the same provider after an actionable failure', async () => {
    const user = userEvent.setup();

    getDevTimesMock
      .mockRejectedValueOnce(new AIRecipeError('rate_limit', 'gemini'))
      .mockResolvedValueOnce({
        options: [createRecipe()],
        confidence: 'medium',
      });

    renderFilmSearch();

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/rate limiting requests/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(getDevTimesMock).toHaveBeenCalledTimes(2);
    });

    expect(getDevTimesMock).toHaveBeenLastCalledWith(
      'gemini',
      'gemini-key',
      'Tri-X 400',
      'Rodinal',
      '400',
      DEFAULT_SETTINGS.defaultBwTempC,
      '',
      'bw',
    );
  });

  it('tries the alternate provider after a failure when another key is available', async () => {
    const user = userEvent.setup();
    const onProviderChange = vi.fn().mockResolvedValue(undefined);

    getDevTimesMock
      .mockRejectedValueOnce(new AIRecipeError('invalid_response', 'gemini'))
      .mockResolvedValueOnce({
        options: [createRecipe({ developer: 'XTOL', source: 'Mistral Search' })],
        confidence: 'medium',
      });

    renderFilmSearch({ onProviderChange });

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/returned unusable recipe data/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /try mistral instead/i }));

    await waitFor(() => {
      expect(onProviderChange).toHaveBeenCalledWith('mistral');
      expect(getDevTimesMock).toHaveBeenNthCalledWith(
        2,
        'mistral',
        'mistral-key',
        'Tri-X 400',
        'Rodinal',
        '400',
        DEFAULT_SETTINGS.defaultBwTempC,
        '',
        'bw',
      );
    });
  });

  it('routes alternate-provider recovery to settings when no second key is available', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    getDevTimesMock.mockRejectedValueOnce(new AIRecipeError('auth', 'gemini'));

    renderFilmSearch({
      apiKeys: { gemini: 'gemini-key', mistral: '' },
      onOpenSettings,
    });

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/needs a valid api key/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /open settings/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('pulls to retry the last query with the currently selected provider', async () => {
    const user = userEvent.setup();

    getDevTimesMock
      .mockResolvedValueOnce({
        options: [createRecipe()],
        confidence: 'high',
      })
      .mockResolvedValueOnce({
        options: [createRecipe({ developer: 'XTOL', dilution: '1+1', source: 'Mistral Search' })],
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

    renderFilmSearch();

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/gemini found 1 option/i)).toBeInTheDocument();
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
        'Tri-X 400',
        'Rodinal',
        '400',
        DEFAULT_SETTINGS.defaultBwTempC,
        '',
        'bw',
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/mistral found 1 option/i)).toBeInTheDocument();
    });
  });

  it('clears stale results on pull when offline instead of retrying', async () => {
    const user = userEvent.setup();

    getDevTimesMock.mockResolvedValueOnce({
      options: [createRecipe()],
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

    renderFilmSearch({
      apiKeys: { gemini: 'gemini-key', mistral: '' },
    });

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));

    await waitFor(() => {
      expect(screen.getByText(/gemini found 1 option/i)).toBeInTheDocument();
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
      expect(screen.queryByText(/gemini found 1 option/i)).not.toBeInTheDocument();
    });
    expect(getDevTimesMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it('keeps only the newest overlapping request result', async () => {
    const user = userEvent.setup();
    let resolveFirst: ((value: unknown) => void) | undefined;
    let resolveSecond: ((value: unknown) => void) | undefined;

    getDevTimesMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    renderFilmSearch();

    await fillCoreFields(user, 'Tri-X 400', 'Rodinal');

    const form = screen.getByRole('button', { name: /ask ai/i }).closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);
    await waitFor(() => {
      expect(getDevTimesMock).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: /mistral/i }));
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(getDevTimesMock).toHaveBeenCalledTimes(2);
    });

    resolveSecond?.({
      options: [createRecipe({ developer: 'XTOL', dilution: '1+1', source: 'Mistral Search' })],
      confidence: 'medium',
    });
    await waitFor(() => {
      expect(screen.getByText(/mistral found 1 option/i)).toBeInTheDocument();
      expect(screen.getByText(/xtol/i)).toBeInTheDocument();
    });

    resolveFirst?.({
      options: [createRecipe({ developer: 'Rodinal', source: 'Massive Dev Chart' })],
      confidence: 'medium',
    });
    await flushPromises();

    expect(screen.getByText(/xtol/i)).toBeInTheDocument();
    expect(screen.queryByText(/massive dev chart/i)).not.toBeInTheDocument();
  });
});
