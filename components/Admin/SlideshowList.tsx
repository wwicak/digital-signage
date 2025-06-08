import React, { Component } from "react";
import ContentLoader from "react-content-loader";

import SlideshowCard from "./SlideshowCard"; // SlideshowCard.tsx and its props
import { getSlideshows, ISlideshowData } from "../../actions/slideshow"; // ISlideshowData is already defined

// This component doesn't seem to receive any specific props from its parent.
export interface ISlideshowListProps {
  // Add any props if they are passed from a parent component.
}

interface ISlideshowListState {
  slideshows: ISlideshowData[] | null; // null when loading, array (possibly empty) when loaded
  error?: string | null; // To store any error messages during fetch
}

class SlideshowList extends Component<
  ISlideshowListProps,
  ISlideshowListState
> {
  constructor(props: ISlideshowListProps) {
    super(props);

    this.state = {
      slideshows: null,
      error: null,
    };
  }

  componentDidMount() {
    this.refresh();
  }

  refresh = (): void => {
    // Reset error and loading state on refresh
    this.setState({ slideshows: null, error: null });
    getSlideshows()
      .then((slideshows) => {
        this.setState({
          slideshows: slideshows || [], // Ensure slideshows is always an array if API returns null/undefined
        });
      })
      .catch((error) => {
        console.error("Failed to fetch slideshows:", error);
        this.setState({
          slideshows: [], // Set to empty array on error to stop showing loaders
          error: "Failed to load slideshows. Please try again later.",
        });
      });
  };

  render() {
    const { slideshows, error } = this.state;

    if (error) {
      return <div className="text-center p-5 font-sans">{error}</div>;
    }

    return (
      <div className={"slideshow-list"}>
        {" "}
        {/* Renamed class */}
        {slideshows
          ? slideshows.map(
              (
                slideshow, // Removed index from map as it's not used in SlideshowCard props directly
              ) => (
                <SlideshowCard
                  key={slideshow._id} // Use slideshow._id for key
                  value={slideshow}
                  refresh={this.refresh}
                  // The 'index' prop was passed in JS but SlideshowCard doesn't use it.
                />
              ),
            )
          : Array(3) // Show 3 loaders for slideshows
              .fill(0)
              .map((_, index) => (
                <ContentLoader
                  key={`loader-slideshow-${index}`}
                  height={100} // Height of one SlideshowCard placeholder
                  width={640} // Max width of card or list area
                  speed={2}
                  backgroundColor="#f3f3f3"
                  foregroundColor="#ecebeb"
                >
                  {/* Placeholder for SlideshowCard structure */}
                  <rect
                    x="0"
                    y="10"
                    rx="4"
                    ry="4"
                    width="50"
                    height="50"
                  />{" "}
                  {/* Thumbnail */}
                  <rect
                    x="60"
                    y="10"
                    rx="3"
                    ry="3"
                    width="300"
                    height="15"
                  />{" "}
                  {/* Title */}
                  <rect
                    x="60"
                    y="30"
                    rx="3"
                    ry="3"
                    width="80"
                    height="10"
                  />{" "}
                  {/* Duration Info */}
                  <rect
                    x="150"
                    y="30"
                    rx="3"
                    ry="3"
                    width="80"
                    height="10"
                  />{" "}
                  {/* Slide Num Info */}
                  <rect
                    x="600"
                    y="25"
                    rx="3"
                    ry="3"
                    width="20"
                    height="20"
                  />{" "}
                  {/* Delete Icon */}
                </ContentLoader>
              ))}
      </div>
    );
  }
}

// Not wrapped with view() in original, so keeping it that way.
export default SlideshowList;
