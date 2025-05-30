import React, { Component } from 'react';
import ContentLoader from 'react-content-loader';
import {
  SortableContainer,
  SortableElement,
  SortableContainerProps,
  SortableElementProps,
  SortEndHandler,
} from 'react-sortable-hoc';
import arrayMove from 'array-move';

import SlideCard, { ISlideCardProps, ExtendedSlideData } from './SlideCard'; // Assuming SlideCard.tsx and its props
import { getSlides, ISlideData } from '../../actions/slide'; // ISlideData is already defined
import { reorderSlides } from '../../actions/slideshow'; // Action for reordering

// Props for the SortableItem (SlideCard)
// SortableElement injects `index` (which is the original index, not the current one during drag)
// and `collection` (the key of the SortableContainer if multiple are on the page).
// We also pass `value` (slide data) and `refresh` callback.
interface ISortableItemProps extends Omit<SortableElementProps, 'index'> { // Omit SortableElementProps's index if we pass our own
  value: ExtendedSlideData; // Slide data
  refresh: () => void;
  // id prop was passed in JS but seems redundant if 'key' and 'index' are used by SortableElement
}

const SortableItem = SortableElement<ISortableItemProps>(({ value, refresh }: ISortableItemProps) => (
  // SlideCard expects 'value' and 'refresh'.
  // The `id` prop in the original JS for SortableItem seemed to be the same as `index`.
  // `key` is essential for React's list rendering.
  // `index` is required by SortableElement for its internal logic.
  <SlideCard value={value} refresh={refresh} />
));


// Props for the SortableList
interface ISortableListProps extends SortableContainerProps {
  items: ExtendedSlideData[];
  refresh: () => void;
}

const SortableList = SortableContainer<ISortableListProps>(({ items, refresh }: ISortableListProps) => {
  return (
    <div className={'slide-list-container'}> {/* Renamed class */}
      <div className={'timeline-decorator'} /> {/* Renamed class */}
      {items.map((value, index) => (
        <SortableItem
          key={value._id || `item-${index}`} // Use unique slide ID for key
          index={index} // This is the crucial prop for react-sortable-hoc
          value={value}
          refresh={refresh}
        />
      ))}
      <style jsx>
        {`
          .slide-list-container { /* Renamed */
            position: relative;
          }
          .timeline-decorator { /* Renamed */
            width: 4px;
            height: calc(100% - 20px); /* Adjust if card vertical margins change */
            border-radius: 2px;
            position: absolute;
            left: 50%;
            top: 10px; /* Adjust if card vertical margins change */
            margin-left: -2px;
            background: #cccccc;
            z-index: 0; /* Ensure it's behind cards */
          }
        `}
      </style>
    </div>
  );
});

export interface ISlideListProps {
  slideshowId: string; // ID of the slideshow whose slides are to be listed
}

interface ISlideListState {
  slides: ExtendedSlideData[] | null;
  error?: string | null;
}

class SlideList extends Component<ISlideListProps, ISlideListState> {
  constructor(props: ISlideListProps) {
    super(props);
    this.state = {
      slides: null,
      error: null,
    };
  }

  componentDidMount() {
    this.fetchSlides();
  }
  
  componentDidUpdate(prevProps: ISlideListProps) {
    if (this.props.slideshowId !== prevProps.slideshowId) {
      this.fetchSlides();
    }
  }

  fetchSlides = (): void => {
    const { slideshowId } = this.props;
    if (!slideshowId) {
        this.setState({slides: [], error: "Slideshow ID is missing."});
        return;
    }
    this.setState({slides: null, error: null}); // Set loading state
    getSlides(slideshowId)
      .then(slides => {
        // Assuming slides from API might not have 'order', map them if needed
        // or ensure ISlideData / ExtendedSlideData handles this.
        // For now, directly using API response.
        this.setState({
          slides: slides.map((slide, index) => ({...slide, order: slide.position ?? index })) as ExtendedSlideData[],
        });
      })
      .catch(error => {
        console.error("Failed to fetch slides:", error);
        this.setState({ slides: [], error: "Failed to load slides." });
      });
  };

  // SortEndHandler from react-sortable-hoc
  onSortEnd: SortEndHandler = ({ oldIndex, newIndex }) => {
    const { slideshowId } = this.props;
    if (this.state.slides && oldIndex !== newIndex) {
      this.setState(
        ({ slides }) => ({
          slides: slides ? arrayMove(slides, oldIndex, newIndex) : null,
        }),
        () => {
          // After optimistically updating UI, call API to persist order
          reorderSlides(slideshowId, oldIndex, newIndex)
            .catch(error => {
              console.error("Failed to reorder slides on server:", error);
              // Optionally revert UI change or show error message
              this.fetchSlides(); // Re-fetch to get server state
            });
        }
      );
    }
  };

  // refresh method is passed to SlideCard, which might call it after edits/deletes
  refresh = (): void => {
    this.fetchSlides();
  };

  render() {
    const { slides, error } = this.state;

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return slides ? (
      <SortableList
        items={slides}
        refresh={this.refresh}
        onSortEnd={this.onSortEnd}
        distance={2} // Minimum distance (pixels) to drag before sorting starts
        lockAxis='y' // Only allow vertical sorting
        helperClass="sortable-helper-class" // Optional: class for the dragged item
      />
    ) : (
      Array(4)
        .fill(0)
        .map((_, index) => (
          <ContentLoader
            key={`loading-slide-${index}`}
            height={100} // Adjusted height to better match SlideCard
            width={640} // Max width
            speed={2}
            primaryColor="#f3f3f3"
            secondaryColor="#ecebeb"
          >
            {/* Placeholder for SlideCard structure */}
            <rect x="0" y="10" rx="4" ry="4" width="50" height="50" /> {/* Thumbnail */}
            <rect x="60" y="10" rx="3" ry="3" width="300" height="15" /> {/* Title */}
            <rect x="60" y="30" rx="3" ry="3" width="80" height="10" /> {/* Duration */}
            <rect x="580" y="25" rx="3" ry="3" width="20" height="20" /> {/* Edit Icon */}
            <rect x="610" y="25" rx="3" ry="3" width="20" height="20" /> {/* Delete Icon */}
          </ContentLoader>
        ))
    );
  }
}

export default SlideList;
