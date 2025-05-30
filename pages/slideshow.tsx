import React from 'react';
import { NextPage, NextPageContext } from 'next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';
import { view } from 'react-easy-state';
import { SortEndHandler } from 'react-sortable-hoc'; // Import SortEndHandler

import Frame from '../components/Admin/Frame';
import SlideListComponent, { ISlideListProps } from '../components/Admin/SlideList'; // Renamed and import props
import SlideEditDialogComponent, { ISlideEditDialogRef } from '../components/Admin/SlideEditDialog'; // Renamed and import ref interface
import Upload from '../components/Upload';
import Button from '../components/Form/Button';
import Dialog from '../components/Dialog'; // Assuming this is a generic Dialog component

import { getSlideshow, updateSlideshow, ISlideshowData } from '../actions/slideshow'; // Using ISlideshowData
import { protect, IProtectedPageProps } from '../helpers/auth'; // Using IProtectedPageProps
import { display } from '../stores'; // Assuming stores are typed

// Define the structure of a slideshow object
interface SlideshowData extends ISlideshowData {
  // May add component-specific properties here if needed, but for now match ISlideshowData
}

// Props for the Slideshow component
interface SlideshowProps extends IProtectedPageProps {
  slideshow?: SlideshowData; // slideshow can be undefined if ID is new or not found
  // host and loggedIn are already in IProtectedPageProps
  // displayId is already in IProtectedPageProps
}

// State for the Slideshow component
interface SlideshowState {
  slideshow?: SlideshowData; // Mirroring props, slideshow can be undefined
}

// Placeholder types for component instances via refs (using the actual component class for full type checking)
// No longer need to manually define all methods if using the component class directly as the ref type.
// The interfaces ISlideEditDialogRef and SlideListInstance are for *what we expect* to find via the ref,
// but the ref itself should be typed as the component class.
// ISlideEditDialogRef is already defined in components/Admin/SlideEditDialog.tsx
// We will use that directly.

const updateSlideshowThrottled = _.debounce((id: string, data: Partial<SlideshowData>) => {
  return updateSlideshow(id, data);
}, 300);

class Slideshow extends React.Component<SlideshowProps, SlideshowState> {
  private slideList = React.createRef<SlideListComponent>();
  private dialog = React.createRef<SlideEditDialogComponent>();

  constructor(props: SlideshowProps) {
    super(props);
    this.state = { slideshow: props.slideshow };
  }

  static async getInitialProps(ctx: any): Promise<Partial<SlideshowProps>> {
    const id = ctx.query.id as string | undefined;
    const host =
      ctx.req && ctx.req.headers && ctx.req.headers.host
        ? (ctx.req.socket?.encrypted ? 'https://' : 'http://') + ctx.req.headers.host
        : window.location.origin;
    
    if (id) {
      try {
        const slideshow = await getSlideshow(id, host); // Assuming getSlideshow returns SlideshowData or null/undefined
        return { slideshow, host, displayId: ctx.query.displayId as string | undefined };
      } catch (error) {
        console.error("Failed to get slideshow:", error);
        return { host, displayId: ctx.query.displayId as string | undefined }; // Return host and other props even if slideshow fetch fails
      }
    }
    return { host, displayId: ctx.query.displayId as string | undefined };
  }

  componentDidMount() {
    const { displayId } = this.props;
    if (displayId) {
      display.setId(displayId);
    }
  }

  refresh = (): Promise<void> => {
    const currentSlideshow = this.state.slideshow;
    if (currentSlideshow && currentSlideshow._id) {
      return getSlideshow(currentSlideshow._id, this.props.host).then(slideshow => {
        this.setState({ slideshow }, () => {
          if (this.slideList && this.slideList.current) {
            this.slideList.current.refresh();
          }
        });
      }).catch(error => console.error("Refresh failed:", error));
    }
    return Promise.resolve();
  };

  openAddDialog = (): Promise<void> => {
    if (this.dialog && this.dialog.current) {
      this.dialog.current.open();
    }
    return Promise.resolve();
  };

  handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    const currentSlideshow = this.state.slideshow;

    if (currentSlideshow) {
      this.setState(
        prevState => ({
          slideshow: prevState.slideshow ? { ...prevState.slideshow, title: newTitle } : undefined,
        }),
        () => {
          if (this.state.slideshow) { // Check again due to async nature of setState
            updateSlideshowThrottled(this.state.slideshow._id, { name: newTitle });
          }
        }
      );
    }
  };

  render() {
    const { loggedIn } = this.props;
    const { slideshow } = this.state;

    return (
      <Frame loggedIn={loggedIn}>
        <h1 className='title'>Slideshow: </h1>{' '}
        <div className='editable-title'>
          <input
            className='input'
            placeholder='Untitled Slideshow'
            value={(slideshow && slideshow.name) || ''} // Handle undefined case for value. ISlideshowData has name, not title
            onChange={this.handleTitleChange}
            onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
            size={(slideshow && slideshow.name && slideshow.name.length) || 20} // Default size
          />
          <div className='icon'>
            <FontAwesomeIcon icon={faPencilAlt as IconDefinition} fixedWidth color='#828282' />
          </div>
        </div>
        <div className='wrapper'>
          <Upload slideshowId={slideshow && slideshow._id || ''} refresh={this.refresh} /> {/* Ensure slideshowId is string */}
          <SlideEditDialogComponent
            slideshowId={slideshow && slideshow._id || ''} // Ensure slideshowId is string
            refresh={this.refresh}
            ref={this.dialog}
          />
          <Button
            text='Add a slide'
            color='#7bc043'
            style={{ flex: 1, margin: 0, width: '100%', marginTop: 20 }}
            onClick={this.openAddDialog}
          />
          {/* Ensure slideshowId is string for SlideListComponent */}
          <SlideListComponent ref={this.slideList} slideshowId={slideshow && slideshow._id || ''} />
          {/* Assuming DialogProps requires children, provide an empty one */}
          <Dialog><div></div></Dialog>
        </div>
        <style jsx>
          {`
            h1 {
              font-family: 'Open Sans', sans-serif;
              font-size: 24px;
              color: #4f4f4f;
              margin: 0px;
            }
            .title {
              display: inline-block;
            }
            .editable-title {
              display: inline-block;
              position: relative;
              margin-left: 16px;
              margin-right: 16px;
              border-bottom: 3px solid #aaa;
            }
            .editable-title .input {
              font-family: 'Open Sans', sans-serif;
              color: #666;
              background-color: transparent;
              min-height: 40px;
              border: none;
              outline: none;
              margin-right: 24px;
              font-size: 24px;
              font-weight: 600;
            }
            .editable-title .icon {
              position: absolute;
              right: 8px;
              top: 50%;
              margin-top: -8px; /* Adjust if icon size changes */
            }
            .wrapper {
              margin: 40px auto;
              max-width: 640px;
            }
          `}
        </style>
      </Frame>
    );
  }
}

export default protect(view(Slideshow as React.ComponentType<SlideshowProps>));
