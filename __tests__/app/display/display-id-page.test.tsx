import { render, screen } from '@testing-library/react';
import DisplayPage from '../../../app/display/[id]/page'; // Adjust path to target the actual page
import DisplayComponent from '../../../components/Display/Display';

// Mock the DisplayComponent
jest.mock('../../../components/Display/Display', () => ({
  __esModule: true,
  default: jest.fn(({ display }) => <div data-testid="mock-display">{`Display ID: ${display}`}</div>),
}));

describe('DisplayPage', () => {
  // Clear mock calls before each test if DisplayComponent is checked for number of calls etc.
  beforeEach(() => {
    const MockedDisplayComponent = DisplayComponent as jest.Mock;
    MockedDisplayComponent.mockClear();
  });

  it('renders the DisplayComponent with the correct id from params', () => {
    const mockParams = { id: 'test-display-id' };
    render(<DisplayPage params={mockParams} />);

    // Ensure DisplayComponent mock is being checked correctly
    const MockedDisplayComponent = DisplayComponent as jest.Mock;
    expect(MockedDisplayComponent).toHaveBeenCalledWith(
      expect.objectContaining({ display: 'test-display-id' }),
      {}
    );
    expect(screen.getByTestId('mock-display')).toHaveTextContent('Display ID: test-display-id');
  });

  it('renders fallback UI if params.id is empty', () => { // Renamed for clarity
    const mockParams = { id: '' };
    render(<DisplayPage params={mockParams} />);

    // Expect the fallback message
    expect(screen.getByText('Loading display information or Display ID not provided...')).toBeInTheDocument();

    // Ensure DisplayComponent was NOT called
    const MockedDisplayComponent = DisplayComponent as jest.Mock;
    expect(MockedDisplayComponent).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-display')).not.toBeInTheDocument(); // The mock display div shouldn't be there
  });
});
