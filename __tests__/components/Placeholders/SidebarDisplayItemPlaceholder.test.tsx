import React from 'react';
import { render } from '@testing-library/react';
import SidebarDisplayItemPlaceholder from '../../../components/Placeholders/SidebarDisplayItemPlaceholder';

describe('SidebarDisplayItemPlaceholder', () => {
  it('renders correctly', () => {
    const { container } = render(<SidebarDisplayItemPlaceholder />);
    // Check for the presence of the outer div with its styles
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveStyle('backgroundColor: #e0e0e0');
    expect(outerDiv).toHaveStyle('height: 40px');

    // Check for the presence of the inner div (the skeleton bar)
    const innerDiv = outerDiv.firstChild as HTMLElement;
    expect(innerDiv).toHaveStyle('backgroundColor: #c0c0c0');
    expect(innerDiv).toHaveStyle('width: 70%');
  });
});
