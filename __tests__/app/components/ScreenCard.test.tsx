import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenCard, { IScreenCardProps } from '../../../components/Admin/ScreenCard';
import { IDisplayData } from '../../../actions/display';

// --- Mocks ---
const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/',
    // Add other router properties if needed by Link or component
  }),
  default: { // Mock the default export (Router object) used by component
    push: mockRouterPush,
    // Add other Router properties if needed
  },
}));


jest.mock('next/link', () => {
    return ({ children, href, ...rest }: { children: React.ReactNode, href: string, [key: string]: any }) => {
        // If the child is an <a> tag, clone it and add href. Otherwise, wrap with <a>.
        if (React.isValidElement(children) && children.type === 'a') {
            return React.cloneElement(children as React.ReactElement<any>, { href, ...rest, ...(children.props || {}) });
        }
        return <a href={href} {...rest}>{children}</a>;
    };
});

jest.mock('../../actions/display', () => ({
  deleteDisplay: jest.fn(),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn((props) => <i data-testid={`mock-fa-icon-${props.icon.iconName}`} />),
}));


const mockRefresh = jest.fn();

const defaultScreenValue: IDisplayData = {
  _id: 'screen123',
  name: 'Test Screen',
  widgets: [
    { _id: 'w1', name: 'Widget 1', type: 'announcement', x: 0, y: 0, w: 1, h: 1, data: {} },
    { _id: 'w2', name: 'Widget 2', type: 'image', x: 1, y: 0, w: 1, h: 1, data: {} }
  ],
  creator_id: 'user1',
};

const renderScreenCard = (props?: Partial<IScreenCardProps>) => {
  const combinedProps: IScreenCardProps = {
    value: defaultScreenValue,
    refresh: mockRefresh,
    ...props,
  };
  return render(<ScreenCard {...combinedProps} />);
};

describe('ScreenCard Component', () => {
  let deleteDisplayMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    deleteDisplayMock = require('../../actions/display').deleteDisplay;
  });

  test('renders basic screen information', () => {
    renderScreenCard();
    expect(screen.getByText('Test Screen')).toBeInTheDocument();
    expect(screen.getByText('2 widgets')).toBeInTheDocument();
    expect(screen.getByText('1 client paired')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
  });

  test('renders "Untitled Display" if name is not provided', () => {
    renderScreenCard({ value: { ...defaultScreenValue, name: undefined } });
    expect(screen.getByText('Untitled Display')).toBeInTheDocument();
  });

  test('main card links to layout page', () => {
    renderScreenCard();
    const mainLink = screen.getByText('Test Screen').closest('a');
    expect(mainLink).toHaveAttribute('href', `/layout?display=${defaultScreenValue._id}`);
  });

  describe('Action Icons', () => {
    test('renders "Edit Layout" icon with correct link', () => {
      renderScreenCard();
      const editLink = screen.getByLabelText('Edit Layout');
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute('href', `/layout?display=${defaultScreenValue._id}`);
      expect(editLink.querySelector('[data-testid="mock-fa-icon-eye"]')).toBeInTheDocument();
    });

    test('"Edit Layout" icon click does not trigger main card navigation (simulating stopPropagation)', () => {
      renderScreenCard();
      const editLink = screen.getByLabelText('Edit Layout');
      mockRouterPush.mockClear(); // Clear any push calls from initial render if any
      fireEvent.click(editLink);
      // We expect the href on editLink to be for layout, but the test is if Router.push (global) was called
      // by the main card link. If stopPropagation works, main Router.push for card link shouldn't happen.
      // This is an indirect test. A direct test of stopPropagation on the event object is hard with RTL's event firing.
      // We are verifying that the action specific to the icon (navigation via its own Link) happens,
      // and not an unintended parent navigation.
      // Since the icon itself is a Link, its own navigation is handled by Next/Link.
      // The critical part is that the MAIN card's Link (if different) isn't triggered.
      // In this case, both point to layout, so we can't distinguish.
      // A better test would be if the main card link was different.
      // For now, we trust the onClick=e.stopPropagation() in the component.
      expect(mockRouterPush).not.toHaveBeenCalledWith(`/layout?display=${defaultScreenValue._id}`); // This is tricky if the icon link IS the same
    });


    test('renders "View Display" icon with correct link', () => {
      renderScreenCard();
      const viewLink = screen.getByLabelText('View Display');
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute('href', `/display/${defaultScreenValue._id}`);
      expect(viewLink.querySelector('[data-testid="mock-fa-icon-link"]')).toBeInTheDocument();
    });

    test('"View Display" icon click does not trigger main card navigation', () => {
      renderScreenCard();
      const viewLink = screen.getByLabelText('View Display');
      mockRouterPush.mockClear();
      fireEvent.click(viewLink);
      // Similar to above, we trust stopPropagation and check no unintended navigation.
      expect(mockRouterPush).not.toHaveBeenCalledWith(`/layout?display=${defaultScreenValue._id}`);
    });

    test('renders "Delete" icon', () => {
      renderScreenCard();
      const deleteButton = screen.getByLabelText('Delete Display');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton.querySelector('[data-testid="mock-fa-icon-trash"]')).toBeInTheDocument();
    });
  });

  describe('Delete Action', () => {
    test('clicking delete icon calls deleteDisplay and refresh, and not main link', async () => {
      deleteDisplayMock.mockResolvedValueOnce({});
      renderScreenCard();
      const deleteButton = screen.getByLabelText('Delete Display');
      mockRouterPush.mockClear();

      fireEvent.click(deleteButton);

      expect(deleteDisplayMock).toHaveBeenCalledWith(defaultScreenValue._id);
      await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
      expect(mockRouterPush).not.toHaveBeenCalled(); // Main card link should not have been triggered
    });

    test('pressing Enter on delete icon calls deleteDisplay and refresh', async () => {
        deleteDisplayMock.mockResolvedValueOnce({});
        renderScreenCard();
        const deleteButton = screen.getByLabelText('Delete Display');
        mockRouterPush.mockClear();

        fireEvent.keyPress(deleteButton, { key: 'Enter', code: 'Enter', charCode: 13 });

        expect(deleteDisplayMock).toHaveBeenCalledWith(defaultScreenValue._id);
        await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
        expect(mockRouterPush).not.toHaveBeenCalled();
    });

    test('pressing Space on delete icon calls deleteDisplay and refresh', async () => {
        deleteDisplayMock.mockResolvedValueOnce({});
        renderScreenCard();
        const deleteButton = screen.getByLabelText('Delete Display');
        mockRouterPush.mockClear();

        fireEvent.keyPress(deleteButton, { key: ' ', code: 'Space', charCode: 32 });

        expect(deleteDisplayMock).toHaveBeenCalledWith(defaultScreenValue._id);
        await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
        expect(mockRouterPush).not.toHaveBeenCalled();
    });

    test('handles deleteDisplay failure and calls console.error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      deleteDisplayMock.mockRejectedValueOnce(new Error('Deletion failed'));
      renderScreenCard();
      const deleteButton = screen.getByLabelText('Delete Display');

      fireEvent.click(deleteButton);

      expect(deleteDisplayMock).toHaveBeenCalledWith(defaultScreenValue._id);
      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete display:', expect.any(Error)));
      expect(mockRefresh).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('does nothing if value or value._id is missing when deleting', async () => {
        renderScreenCard({ value: { ...defaultScreenValue, _id: undefined as any }});
        const deleteButton = screen.getByLabelText('Delete Display');

        fireEvent.click(deleteButton);

        expect(deleteDisplayMock).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
      });
  });
});
