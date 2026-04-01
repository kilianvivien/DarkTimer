import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PresetLibrary } from './PresetLibrary';

const preset = {
  id: 'preset-1',
  createdAt: 1,
  film: 'HP5',
  developer: 'ID-11',
  dilution: '1+1',
  iso: 400,
  tempC: 20,
  processMode: 'bw' as const,
  phases: [],
  notes: '',
};

describe('PresetLibrary', () => {
  it('selects a preset when the card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <PresetLibrary
        presets={[preset]}
        onEdit={vi.fn()}
        onSelect={onSelect}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: /start preset hp5, id-11, iso 400/i }));
    expect(onSelect).toHaveBeenCalledWith(preset);
  });

  it('supports keyboard activation for the preset card', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <PresetLibrary
        presets={[preset]}
        onEdit={vi.fn()}
        onSelect={onSelect}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const cardButton = screen.getByRole('button', { name: /start preset hp5, id-11, iso 400/i });

    await user.tab();
    expect(cardButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(preset);
  });

  it('starts a preset from the explicit play button', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <PresetLibrary
        presets={[preset]}
        onEdit={vi.fn()}
        onSelect={onSelect}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: /play preset hp5/i }));
    expect(onSelect).toHaveBeenCalledWith(preset);
  });

  it('exposes editing from the library card', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <PresetLibrary
        presets={[preset]}
        onEdit={onEdit}
        onSelect={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit preset hp5/i }));
    expect(onEdit).toHaveBeenCalledWith(preset);
  });

  it('requires confirmation before deleting a preset', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <PresetLibrary
        presets={[preset]}
        onEdit={vi.fn()}
        onSelect={onSelect}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete preset hp5/i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm delete preset hp5/i }));
    expect(onDelete).toHaveBeenCalledWith('preset-1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
