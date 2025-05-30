import React, { Component } from 'react';
import ContentLoader from 'react-content-loader';

import ScreenCard, { IScreenCardProps } from './ScreenCard'; // Assuming ScreenCard.tsx and its props
import { getDisplays, IDisplayData } from '../../actions/display'; // IDisplayData is already defined

// This component doesn't seem to receive any specific props from its parent in the current usage.
export interface IScreenListProps {
  // Add any props if they are passed from a parent component.
  // For example: filterCriteria?: string;
}

interface IScreenListState {
  screens: IDisplayData[] | null; // null when loading, array (possibly empty) when loaded
  error?: string | null; // To store any error messages during fetch
}

class ScreenList extends Component<IScreenListProps, IScreenListState> {
  constructor(props: IScreenListProps) {
    super(props);

    this.state = {
      screens: null,
      error: null,
    };
  }

  componentDidMount() {
    this.refresh();
  }

  refresh = (): void => {
    // Reset error state on refresh
    this.setState({ screens: null, error: null }); 
    getDisplays()
      .then(screens => {
        this.setState({
          screens: screens || [], // Ensure screens is always an array if API returns null/undefined
        });
      })
      .catch(error => {
        console.error("Failed to fetch screens:", error);
        this.setState({
          screens: [], // Set to empty array on error to stop showing loaders
          error: "Failed to load screens. Please try again later.",
        });
      });
  };

  render() {
    const { screens, error } = this.state;

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    return (
      <div className={'list'}>
        {screens
          ? screens.map((screen, index) => (
              <ScreenCard
                key={screen._id || `item-${index}`} // Use screen._id for key if available
                value={screen}
                refresh={this.refresh}
              />
            ))
          : Array(4) // Show 4 loaders while data is being fetched
              .fill(0) // Pass a value to fill to satisfy map's need for an array with actual elements
              .map((_, index) => ( // Use index for key of loaders
                <ContentLoader
                  key={`loader-${index}`}
                  height={120} // Height of one card placeholder
                  width={640}  // Max width of card or list area
                  speed={2}
                  primaryColor="#f3f3f3"
                  secondaryColor="#ecebeb"
                >
                  {/* Placeholder for ScreenCard structure */}
                  <rect x='0' y='10' rx='4' ry='4' width='60' height='60' /> {/* Thumbnail */}
                  <rect x='70' y='10' rx='3' ry='3' width='300' height='15' /> {/* Title */}
                  <rect x='70' y='35' rx='3' ry='3' width='100' height='10' /> {/* Widget Num */}
                  <rect x='180' y='35' rx='3' ry='3' width='80' height='10' /> {/* Client Num */}
                  <rect x='270' y='35' rx='3' ry='3' width='50' height='10' /> {/* Online Status */}
                  <rect x='0' y='80' rx='5' ry='5' width='100%' height='1' /> {/* Separator if any, or just part of overall height */}
                </ContentLoader>
              ))}
        <style jsx>
          {`
            .list {
              position: relative;
              max-width: 640px; /* Example max-width, adjust as needed */
              margin: 0 auto; /* Center the list */
            }
            .error-message {
              color: red;
              text-align: center;
              padding: 20px;
              font-family: 'Open Sans', sans-serif;
            }
          `}
        </style>
      </div>
    );
  }
}

// Note: The original component was not wrapped with `view` from react-easy-state.
// If it needs to react to global store changes, it should be.
// For now, keeping it as it was.
export default ScreenList;
