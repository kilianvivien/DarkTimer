import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HistoryView } from './HistoryView';
import type { Session } from '../services/recipe';

const sessions: Session[] = [
  {
    id: 'completed-session',
    recipe: {
      film: 'Tri-X 400',
      developer: 'HC-110',
      dilution: 'B',
      iso: 400,
      tempC: 20,
      processMode: 'bw',
      phases: [
        { name: 'Developer', duration: 420, agitationMode: 'every-60s', agitation: 'Agitate every minute.' },
        { name: 'Fixer', duration: 240, agitationMode: 'stand', agitation: 'Stand.' },
      ],
      notes: 'Strong negatives.',
      source: 'Massive Dev Chart',
    },
    startTime: new Date('2026-03-31T10:00:00Z').getTime(),
    endTime: new Date('2026-03-31T10:11:00Z').getTime(),
    status: 'completed',
    phasesCompleted: 2,
  },
  {
    id: 'partial-session',
    recipe: {
      film: 'HP5 Plus',
      developer: 'ID-11',
      dilution: '1+1',
      iso: 400,
      tempC: 20,
      processMode: 'bw',
      phases: [{ name: 'Developer', duration: 360, agitationMode: 'every-60s', agitation: 'Agitate every minute.' }],
      notes: '',
    },
    startTime: new Date('2026-03-30T10:00:00Z').getTime(),
    endTime: new Date('2026-03-30T10:03:00Z').getTime(),
    status: 'partial',
    phasesCompleted: 0,
  },
];

describe('HistoryView', () => {
  it('renders an empty state when no sessions exist', () => {
    render(<HistoryView sessions={[]} />);

    expect(screen.getByText(/no session history yet/i)).toBeInTheDocument();
  });

  it('renders session summaries in order with status badges', () => {
    render(<HistoryView sessions={sessions} />);

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Tri-X 400');
    expect(headings[1]).toHaveTextContent('HP5 Plus');
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('expands a session to reveal recipe and phase details', async () => {
    const user = userEvent.setup();

    render(<HistoryView sessions={sessions} />);

    await user.click(screen.getByRole('button', { name: /tri-x 400/i }));

    expect(screen.getByText(/recipe notes/i)).toBeInTheDocument();
    expect(screen.getByText('Strong negatives.')).toBeInTheDocument();
    expect(screen.getByText('Massive Dev Chart')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Fixer')).toBeInTheDocument();
  });

  it('records the negative outcome and roll notes', async () => {
    const user = userEvent.setup();
    const onUpdateLog = vi.fn().mockResolvedValue(undefined);

    render(<HistoryView sessions={sessions} onUpdateLog={onUpdateLog} />);

    await user.click(screen.getByRole('button', { name: /tri-x 400/i }));
    await user.click(screen.getByRole('button', { name: 'Dense' }));

    expect(onUpdateLog).toHaveBeenLastCalledWith('completed-session', { outcome: 'dense' });

    await user.type(screen.getByLabelText(/roll notes/i), 'Cut 10%');
    await user.tab();

    expect(onUpdateLog).toHaveBeenLastCalledWith('completed-session', { logNotes: 'Cut 10%' });
  });

  it('shows a saved outcome and can re-run a session recipe', async () => {
    const user = userEvent.setup();
    const onRunAgain = vi.fn();

    render(
      <HistoryView
        sessions={[{ ...sessions[0], outcome: 'thin' }, sessions[1]]}
        onRunAgain={onRunAgain}
      />,
    );

    expect(screen.getByText('Thin')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tri-x 400/i }));
    await user.click(screen.getByRole('button', { name: /run again/i }));

    expect(onRunAgain).toHaveBeenCalledWith(sessions[0].recipe);
  });
});
