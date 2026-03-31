import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ManualTimerForm } from './ManualTimerForm';
import { DEFAULT_SETTINGS } from '../services/userSettings';

describe('ManualTimerForm', () => {
  it('switches process mode defaults and keeps developer/fixer agitation in sync', async () => {
    const user = userEvent.setup();

    render(
      <ManualTimerForm
        onStart={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    expect(screen.getByDisplayValue('Developer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Stop Bath')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fixer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Wash')).toBeInTheDocument();

    const developerRow = screen.getByDisplayValue('Developer').closest('.utilitarian-border');
    const fixerRow = screen.getByDisplayValue('Fixer').closest('.utilitarian-border');
    expect(developerRow).not.toBeNull();
    expect(fixerRow).not.toBeNull();

    const developerAgitation = within(developerRow as HTMLElement).getByRole('combobox');
    const fixerAgitation = within(fixerRow as HTMLElement).getByRole('combobox');

    await user.selectOptions(developerAgitation, 'every-30s');
    expect(fixerAgitation).toHaveValue('every-30s');

    await user.selectOptions(fixerAgitation, 'stand');
    expect(fixerAgitation).toHaveValue('every-30s');

    await user.click(screen.getByRole('button', { name: 'Color Negative & Slide' }));
    expect(screen.getByDisplayValue('Blix')).toBeInTheDocument();
    expect(screen.getByDisplayValue('38')).toBeInTheDocument();
  });

  it('builds and starts a recipe from the current form state', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();

    render(
      <ManualTimerForm
        onStart={onStart}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.clear(screen.getByPlaceholderText('e.g. HP5 Plus'));
    await user.type(screen.getByPlaceholderText('e.g. HP5 Plus'), 'HP5 Plus');
    await user.clear(screen.getByPlaceholderText('e.g. ID-11'));
    await user.type(screen.getByPlaceholderText('e.g. ID-11'), 'ID-11');
    await user.clear(screen.getByPlaceholderText('e.g. 1+1'));
    await user.type(screen.getByPlaceholderText('e.g. 1+1'), '1+1');
    await user.click(screen.getByRole('button', { name: /start session/i }));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        film: 'HP5 Plus',
        developer: 'ID-11',
        dilution: '1+1',
        processMode: 'bw',
        tempC: DEFAULT_SETTINGS.defaultBwTempC,
        notes: 'Manual entry',
      }),
    );
    expect(onStart.mock.calls[0][0].phases[0]).toMatchObject({
      name: 'Developer',
      agitationMode: 'every-60s',
      agitation: 'Agitate every 1 minute.',
    });
  });
});
