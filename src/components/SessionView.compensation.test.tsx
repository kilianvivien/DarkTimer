import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionView } from './SessionView';
import { DEFAULT_SETTINGS } from '../services/userSettings';

const recipe = {
  film: 'HP5 Plus',
  developer: 'ID-11',
  dilution: '1+1',
  iso: 400,
  tempC: 20,
  processMode: 'bw' as const,
  phases: [{ name: 'Developer', duration: 360, agitationMode: 'every-60s' as const }],
  notes: '',
};

describe('SessionView compensation flow', () => {
  it('starts the timer and enters immersive mode after enabling reuse compensation', async () => {
    const user = userEvent.setup();

    render(
      <SessionView
        recipe={recipe}
        onExit={vi.fn()}
        onSaveSession={vi.fn().mockResolvedValue(undefined)}
        settings={DEFAULT_SETTINGS}
      />,
    );

    await user.click(screen.getByRole('button', { name: /reuse compensation/i }));
    await user.click(screen.getByRole('button', { name: /custom/i }));
    await user.click(screen.getByRole('button', { name: '5%' }));

    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: /start/i })[0]);
    });

    expect(screen.getByText('Starting in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave fullscreen/i })).toBeInTheDocument();
  });
});
