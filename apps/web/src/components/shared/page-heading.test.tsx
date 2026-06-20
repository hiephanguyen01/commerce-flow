import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeading } from './page-heading';

describe('PageHeading', () => {
  it('renders the title and description', () => {
    render(<PageHeading title="CommerceFlow" description="Professional commerce platform" />);

    expect(
      screen.getByRole('heading', {
        name: 'CommerceFlow',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Professional commerce platform')).toBeInTheDocument();
  });

  it('does not render description when it is missing', () => {
    render(<PageHeading title="CommerceFlow" />);

    expect(screen.queryByText('Professional commerce platform')).not.toBeInTheDocument();
  });
});
