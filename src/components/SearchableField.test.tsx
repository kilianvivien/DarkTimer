import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SearchableField } from './SearchableField';

const options = [
  { value: 'Tri-X 400', label: 'Tri-X 400', keywords: ['kodak'] },
  { value: 'HP5 Plus', label: 'HP5 Plus', keywords: ['ilford'] },
];

describe('SearchableField', () => {
  function Harness({
    label,
    placeholder,
  }: {
    label: string;
    placeholder: string;
  }) {
    const [value, setValue] = React.useState('');

    return (
      <SearchableField
        label={label}
        options={options}
        placeholder={placeholder}
        value={value}
        onChange={setValue}
      />
    );
  }

  it('shows matching suggestions and selects one', async () => {
    const user = userEvent.setup();

    render(<Harness label="Film Stock" placeholder="Search films" />);

    const input = screen.getByRole('combobox', { name: /film stock/i });
    await user.type(input, 'Tri');
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Tri-X 400' }));

    expect(input).toHaveValue('Tri-X 400');
  });

  it('keeps free-text entry when nothing matches', async () => {
    const user = userEvent.setup();

    render(<Harness label="Developer" placeholder="Search developers" />);

    const input = screen.getByRole('combobox', { name: /developer/i });
    await user.click(input);
    await user.type(input, 'Custom Soup');

    expect(input).toHaveValue('Custom Soup');
    expect(screen.getByText(/keep typing to use a custom value/i)).toBeInTheDocument();
    expect(input).toHaveClass('utilitarian-input');
    expect(input).toHaveClass('mobile-form-control-inline');
  });
});
