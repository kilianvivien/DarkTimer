import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChemsView } from './ChemsView';
import type { StoredChem } from '../services/chemTypes';

const baseChem: StoredChem = {
  id: 'chem-1',
  name: 'ID-11',
  type: 'developer',
  processMode: 'bw',
  mixDate: Date.UTC(2026, 3, 1),
  expirationDate: null,
  rollCount: 0,
  maxRolls: 24,
  notes: '',
  createdAt: Date.UTC(2026, 3, 1),
};

function renderChemsView(chems: StoredChem[] = []) {
  return render(
    <ChemsView
      chems={chems}
      onAdd={vi.fn().mockResolvedValue(undefined)}
      onUpdate={vi.fn().mockResolvedValue(undefined)}
      onDelete={vi.fn().mockResolvedValue(undefined)}
      onIncrement={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

describe('ChemsView', () => {
  it('uses the shared searchable field for new chemistry suggestions', async () => {
    const user = userEvent.setup();

    renderChemsView();

    await user.click(screen.getByRole('button', { name: /add chemistry/i }));

    const input = await screen.findByRole('combobox', { name: /name/i });
    await user.click(screen.getByRole('button', { name: /color/i }));
    await user.type(input, 'C-4');

    expect(screen.getByRole('option', { name: 'C-41' })).toBeInTheDocument();
    expect(input).toHaveClass('utilitarian-input');
    expect(input).toHaveClass('mobile-form-control-inline');
  });

  it('uses the shared searchable field while editing chemistry too', async () => {
    const user = userEvent.setup();

    renderChemsView([baseChem]);

    await user.click(screen.getByRole('button', { name: /edit id-11/i }));

    const input = await screen.findByRole('combobox', { name: /name/i });
    await user.clear(input);
    await user.type(input, 'Rodi');

    expect(screen.getByRole('option', { name: 'Rodinal' })).toBeInTheDocument();
  });
});
