import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import Slideshow, { ISlideshowWidgetContentProps, ISlideInstance } from '../../../widgets/slideshow/src/Slideshow';
import { ISlideData, SlideActionDataSchema } from '../../../actions/slide'; // Assuming SlideActionDataSchema is the Zod schema for ISlideData
import { SlideType } from '../../../api/models/Slide';

// --- Mock child components and actions ---

// Mock individual slide type components
const mockSlideRef: ISlideInstance = {
  play: jest.fn(),
  stop: jest.fn(),
  loadedPromise: Promise.resolve(),
};

jest.mock('./Slide/Generic', () => React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => mockSlideRef);
  return <div data-testid="mock-generic-slide" data-slideid={props.slide._id} data-active={props.show}>Generic: {props.slide.data.title}</div>;
}));
jest.mock('./Slide/Photo', () => React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => mockSlideRef);
  return <div data-testid="mock-photo-slide" data-slideid={props.slide._id} data-active={props.show}>Photo: {props.slide.data.title}</div>;
}));
jest.mock('./Slide/Youtube', () => React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => mockSlideRef);
  return <div data-testid="mock-youtube-slide" data-slideid={props.slide._id} data-active={props.show}>Youtube: {props.slide.data.title}</div>;
}));
jest.mock('./Slide/Web', () => React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => mockSlideRef);
  return <div data-testid="mock-web-slide" data-slideid={props.slide._id} data-active={props.show}>Web: {props.slide.data.title}</div>;
}));

// Mock Progress component
jest.mock('./Progress', () => {
  return jest.fn((props: any) => (
    <div data-testid="mock-progress" data-current={props.current} data-total={props.orderedSlides.length}>
      Progress: {props.current + 1}/{props.orderedSlides.length}
    </div>
  ));
});

// Mock getSlides action
const actualMockGetSlides = jest.fn();
jest.mock('../../../actions/slide', () => {
  const originalModule = jest.requireActual('../../../actions/slide');
  return {
    ...originalModule,
    getSlides: (...args: any[]) => actualMockGetSlides(...args),
  };
});

const DEFAULT_SLIDE_DURATION_MS_TEST = 5000;

describe('Slideshow', () => {
  const mockSlides: ISlideData[] = [
    // Zod validation might be strict, ensure data matches SlideActionDataSchema structure
    { _id: 's1', type: SlideType.PHOTO, duration: 3, data: { url: 'url1.jpg', caption: 'Slide 1 Photo' }, is_enabled: true, name:'S1N', slideshow_ids:['ss1'], creator_id: 'user1' },
    { _id: 's2', type: SlideType.YOUTUBE, duration: 0, data: { videoId: 'vid2', url: 'http://youtube.com/watch?v=vid2' }, is_enabled: true, name:'S2N', slideshow_ids:['ss1'], creator_id: 'user1' },
    { _id: 's3', type: SlideType.WEB, duration: 4, data: { url: 'url3.html' }, is_enabled: true, name:'S3N', slideshow_ids:['ss1'], creator_id: 'user1' },
  ];

  const defaultProps: ISlideshowWidgetContentProps = {
    data: {
      slideshow_id: 'test-slideshow-id',
      show_progressbar: true,
      transition_time: 1, // Not directly used by Slideshow.tsx logic for now
      random_order: false, // Not directly used by Slideshow.tsx logic for now
    },
    defaultDuration: DEFAULT_SLIDE_DURATION_MS_TEST, // 5 seconds
  };

  const renderSlideshow = (props: Partial<ISlideshowWidgetContentProps> = {}) => {
    const mergedProps = { ...defaultProps, ...props, data: { ...defaultProps.data, ...props.data } };
    return render(<Slideshow {...mergedProps as any} />);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    actualMockGetSlides.mockClear();
    (mockSlideRef.play as jest.Mock).mockClear();
    (mockSlideRef.stop as jest.Mock).mockClear();
    // Reset any other necessary mocks here
    (jest.requireMock('./Progress') as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('renders loading state initially then fetches and displays slides', async () => {
    actualMockGetSlides.mockResolvedValueOnce([...mockSlides]);
    renderSlideshow();

    expect(screen.getByText('Loading Slideshow...')).toBeInTheDocument();
    await waitFor(() => expect(actualMockGetSlides).toHaveBeenCalledWith('test-slideshow-id'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-photo-slide')).toBeInTheDocument();
      expect(screen.getByText('Photo: Slide 1 Photo')).toBeInTheDocument();
      expect(screen.getByTestId('mock-photo-slide')).toHaveAttribute('data-active', 'true');
    });
    expect(mockSlideRef.play).toHaveBeenCalledTimes(1); // Initial play
  });

  test('displays error message if getSlides fails', async () => {
    actualMockGetSlides.mockRejectedValueOnce(new Error('Fetch failed'));
    renderSlideshow();

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load slides.')).toBeInTheDocument();
    });
  });

  test('displays message if slideshow ID is not provided', async () => {
    renderSlideshow({ data: { slideshow_id: null } });
    await waitFor(() => {
        // The component renders "Error: Slideshow ID not provided."
        expect(screen.getByText(/Error: Slideshow ID not provided./i)).toBeInTheDocument();
    });
  });

  test('displays message if slideshow has no slides', async () => {
    actualMockGetSlides.mockResolvedValueOnce([]);
    renderSlideshow();
    await waitFor(() => {
        expect(screen.getByText('This slideshow has no slides.')).toBeInTheDocument();
    });
  });

  test('cycles through slides', async () => {
    actualMockGetSlides.mockResolvedValueOnce([...mockSlides]);
    renderSlideshow();

    await waitFor(() => expect(screen.getByTestId('mock-photo-slide')).toHaveAttribute('data-active', 'true'));
    expect(mockSlideRef.play).toHaveBeenCalledTimes(1);

    // Advance to slide 2 (Youtube)
    act(() => { jest.advanceTimersByTime(mockSlides[0].duration! * 1000); });
    await waitFor(() => expect(screen.getByTestId('mock-youtube-slide')).toHaveAttribute('data-active', 'true'));
    expect(screen.getByTestId('mock-photo-slide')).toHaveAttribute('data-active', 'false');
    expect(mockSlideRef.stop).toHaveBeenCalledTimes(1);  // Stop on slide 1
    expect(mockSlideRef.play).toHaveBeenCalledTimes(2);   // Play on slide 2

    // Advance to slide 3 (Web) - note: slide 2 duration is 0, so uses default
    act(() => { jest.advanceTimersByTime(DEFAULT_SLIDE_DURATION_MS_TEST); });
    await waitFor(() => expect(screen.getByTestId('mock-web-slide')).toHaveAttribute('data-active', 'true'));
    expect(screen.getByTestId('mock-youtube-slide')).toHaveAttribute('data-active', 'false');
    expect(mockSlideRef.stop).toHaveBeenCalledTimes(2);
    expect(mockSlideRef.play).toHaveBeenCalledTimes(3);

    // Advance back to slide 1 (Photo)
    act(() => { jest.advanceTimersByTime(mockSlides[2].duration! * 1000); });
    await waitFor(() => expect(screen.getByTestId('mock-photo-slide')).toHaveAttribute('data-active', 'true'));
    expect(screen.getByTestId('mock-web-slide')).toHaveAttribute('data-active', 'false');
    expect(mockSlideRef.stop).toHaveBeenCalledTimes(3);
    expect(mockSlideRef.play).toHaveBeenCalledTimes(4);
  });

  test('renders Progress component when show_progressbar is true (default)', async () => {
    actualMockGetSlides.mockResolvedValueOnce([...mockSlides]);
    renderSlideshow();
    await waitFor(() => expect(screen.getByTestId('mock-progress')).toBeInTheDocument());
    expect(screen.getByTestId('mock-progress')).toHaveAttribute('data-current', '0');
    expect(screen.getByTestId('mock-progress')).toHaveAttribute('data-total', String(mockSlides.length));
  });

  test('does not render Progress component when show_progressbar is false', async () => {
    actualMockGetSlides.mockResolvedValueOnce([...mockSlides]);
    renderSlideshow({ data: { slideshow_id: defaultProps.data?.slideshow_id || null, show_progressbar: false } });
    await waitFor(() => expect(actualMockGetSlides).toHaveBeenCalled()); // Ensure slides are loaded
    expect(screen.queryByTestId('mock-progress')).not.toBeInTheDocument();
  });

  test('uses defaultDuration for slides with 0 or undefined duration', async () => {
    actualMockGetSlides.mockResolvedValueOnce([mockSlides[1]]); // Only slide 2 with duration 0
    renderSlideshow();

    await waitFor(() => expect(screen.getByTestId('mock-youtube-slide')).toHaveAttribute('data-active', 'true'));
    // Should schedule next advance using defaultDuration
    // We can check if setTimeout was called with defaultDuration
    // (This requires more intricate timer mocking or checking internal state, which is harder)
    // For now, we trust the advanceToNextSlide logic uses it.
    // We can also observe by advancing time.
    act(() => { jest.advanceTimersByTime(DEFAULT_SLIDE_DURATION_MS_TEST -1); });
    // Still on the same slide
    expect(screen.getByTestId('mock-youtube-slide')).toHaveAttribute('data-active', 'true');

    act(() => { jest.advanceTimersByTime(1); }); // Total defaultDuration passed
    // Should attempt to advance (if more slides, or loop)
    // In this case, it loops to itself.
    await waitFor(() => expect(mockSlideRef.stop).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSlideRef.play).toHaveBeenCalledTimes(2));
  });

  test('re-fetches slides when slideshow_id changes', async () => {
    actualMockGetSlides.mockResolvedValueOnce([...mockSlides]);
    const { rerender } = renderSlideshow();
    await waitFor(() => expect(actualMockGetSlides).toHaveBeenCalledWith('test-slideshow-id'));
    expect(actualMockGetSlides).toHaveBeenCalledTimes(1);

    const newSlides: ISlideData[] = [
      { _id: 's4', type: SlideType.IMAGE, duration: 5, data: { url: 'http://example.com/slide4.jpg', caption: 'New Slide 4' }, slideshow_ids: ['new-id'], is_enabled: true, name:'S4N', creator_id: 'user1' },
    ];
    actualMockGetSlides.mockResolvedValueOnce(newSlides); // Set up for the next call

    rerender(<Slideshow {...defaultProps} data={{ ...defaultProps.data, slideshow_id: 'new-slideshow-id' }} />);

    await waitFor(() => expect(actualMockGetSlides).toHaveBeenCalledWith('new-slideshow-id'));
    expect(actualMockGetSlides).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByTestId('mock-generic-slide')).toBeInTheDocument());
    expect(screen.getByText('Generic: New Slide 4')).toBeInTheDocument();
  });

});
