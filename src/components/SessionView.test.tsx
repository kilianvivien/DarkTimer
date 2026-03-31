import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionView } from './SessionView';
import { DEFAULT_SETTINGS } from '../services/userSettings';

vi.mock('./Timer', () => ({
  Timer: ({ onComplete }: { onComplete: () => void }) => (
    <div>
      <button type="button" onClick={onComplete}>
        Complete Timer
      </button>
    </div>
  ),
}));

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

describe('SessionView', () => {
  it('renders recipe metadata and exits the session', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();

    render(<SessionView recipe={recipe} onExit={onExit} settings={DEFAULT_SETTINGS} />);

    expect(screen.getByText('HP5 Plus')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /exit session/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows the completion state and allows rerunning the timer', async () => {
    const user = userEvent.setup();

    render(<SessionView recipe={recipe} onExit={vi.fn()} settings={DEFAULT_SETTINGS} />);

    await user.click(screen.getByRole('button', { name: 'Complete Timer' }));
    expect(screen.getByText(/session complete/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run again/i }));
    expect(screen.getByRole('button', { name: 'Complete Timer' })).toBeInTheDocument();
  });
});
