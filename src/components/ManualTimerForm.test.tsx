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

    await user.type(screen.getByRole('combobox', { name: /film stock/i }), 'HP5 Plus');
    await user.type(screen.getByRole('combobox', { name: /^developer$/i }), 'ID-11');
    await user.type(screen.getByRole('combobox', { name: /dilution/i }), '1+1');
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

  it('loads a preset into the manual form and updates it', async () => {
    const user = userEvent.setup();
    const onUpdatePreset = vi.fn().mockResolvedValue(undefined);

    render(
      <ManualTimerForm
        editingPreset={{
          id: 'preset-1',
          createdAt: 1,
          film: 'HP5 Plus',
          developer: 'ID-11',
          dilution: '1+1',
          iso: 400,
          tempC: 20,
          processMode: 'bw',
          phases: [{ name: 'Developer', duration: 360, agitationMode: 'every-60s' }],
          notes: '',
        }}
        onCancelEdit={vi.fn()}
        onStart={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        onUpdatePreset={onUpdatePreset}
        settings={DEFAULT_SETTINGS}
      />,
    );

    expect(screen.getByRole('combobox', { name: /film stock/i })).toHaveValue('HP5 Plus');
    expect(screen.getByRole('button', { name: /update preset/i })).toBeInTheDocument();

    await user.clear(screen.getByRole('combobox', { name: /^developer$/i }));
    await user.type(screen.getByRole('combobox', { name: /^developer$/i }), 'DD-X');
    await user.click(screen.getByRole('button', { name: /update preset/i }));

    expect(onUpdatePreset).toHaveBeenCalledWith(
      'preset-1',
      expect.objectContaining({
        film: 'HP5 Plus',
        developer: 'DD-X',
        dilution: '1+1',
      }),
    );
  });

  it('renders inline phase controls with mobile-safe sizing classes', () => {
    render(
      <ManualTimerForm
        onStart={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    const developerRow = screen.getByDisplayValue('Developer').closest('.utilitarian-border');
    expect(developerRow).not.toBeNull();

    const phaseNameInput = screen.getByDisplayValue('Developer');
    const [minutesInput] = within(developerRow as HTMLElement).getAllByRole('spinbutton');
    const phaseAgitationSelect = within(developerRow as HTMLElement).getByRole('combobox');

    expect(phaseNameInput).toHaveClass('mobile-form-control-inline');
    expect(minutesInput).toHaveClass('mobile-form-control-inline');
    expect(phaseAgitationSelect).toHaveClass('mobile-form-control-compact');
    expect(screen.getByRole('combobox', { name: /film stock/i })).toHaveClass('utilitarian-input');
    expect(screen.getByRole('combobox', { name: /^developer$/i })).toHaveClass('utilitarian-input');
    expect(screen.getByRole('combobox', { name: /dilution/i })).toHaveClass('utilitarian-input');
  });

  it('reuses the shared suggestions for film, developer, and dilution', async () => {
    const user = userEvent.setup();

    render(
      <ManualTimerForm
        onStart={vi.fn()}
        onSavePreset={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    const filmInput = screen.getByRole('combobox', { name: /film stock/i });
    await user.click(filmInput);
    await user.type(filmInput, 'Kent');
    expect(screen.getByRole('option', { name: 'Kentmere 400' })).toBeInTheDocument();

    const developerInput = screen.getByRole('combobox', { name: /^developer$/i });
    await user.click(developerInput);
    await user.type(developerInput, 'Micr');
    expect(screen.getByRole('option', { name: 'Microphen' })).toBeInTheDocument();

    const dilutionInput = screen.getByRole('combobox', { name: /dilution/i });
    await user.click(dilutionInput);
    await user.type(dilutionInput, '1+');
    expect(screen.getByRole('option', { name: '1+1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1+25' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1+50' })).toBeInTheDocument();
  });
});
