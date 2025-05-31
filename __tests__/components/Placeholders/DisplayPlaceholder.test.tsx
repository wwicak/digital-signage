import React from 'react';
import { render, screen } from '@testing-library/react';
import DisplayPlaceholder from '../../../components/Placeholders/DisplayPlaceholder';

describe('DisplayPlaceholder', () => {
  it('renders correctly and shows loading text', () => {
    render(<DisplayPlaceholder />);
    expect(screen.getByText('Loading Display...')).toBeInTheDocument();
  });

  it('applies basic styling for centering', () => {
    const { container } = render(<DisplayPlaceholder />);
    const divElement = container.firstChild as HTMLElement;
    expect(divElement).toHaveStyle('display: flex');
    expect(divElement).toHaveStyle('justifyContent: center');
    expect(divElement).toHaveStyle('alignItems: center');
    expect(divElement).toHaveStyle('height: 100%');
  });
});
