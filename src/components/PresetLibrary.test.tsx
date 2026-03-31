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
        onSelect={onSelect}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByText('HP5'));
    expect(onSelect).toHaveBeenCalledWith(preset);
  });

  it('deletes a preset without selecting it', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(<PresetLibrary presets={[preset]} onSelect={onSelect} onDelete={onDelete} />);

    await user.click(screen.getByTitle('Delete Preset'));
    expect(onDelete).toHaveBeenCalledWith('preset-1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
