import React from 'react';
import { NextPage, NextPageContext } from 'next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';
import { view } from 'react-easy-state';

import Frame from '../components/Admin/Frame.tsx';
import SlideListComponent from '../components/Admin/SlideList.tsx'; // Renamed
import SlideEditDialogComponent from '../components/Admin/SlideEditDialog.tsx'; // Renamed
import Upload from '../components/Upload.tsx';
import Button from '../components/Form/Button.tsx';
import Dialog from '../components/Dialog.tsx'; // Assuming this is a generic Dialog component

import { getSlideshow, updateSlideshow } from '../actions/slideshow'; // Assuming .ts and typed
import { protect, ProtectProps } from '../helpers/auth.ts'; // Assuming .ts
import { display } from '../stores'; // Assuming stores are typed

// Define the structure of a slideshow object
interface SlideshowData {
  _id: string;
  title: string;
  // Add other properties of slideshow object here, e.g., slides: any[]
}

// Props for the Slideshow component
interface SlideshowProps extends ProtectProps {
  slideshow?: SlideshowData; // slideshow can be undefined if ID is new or not found
  host: string;
  displayId?: string; // from query or HOC
}

// State for the Slideshow component
interface SlideshowState {
  slideshow?: SlideshowData; // Mirroring props, slideshow can be undefined
}

// Placeholder types for component instances via refs
interface SlideListInstance {
  refresh: () => void;
}
interface SlideEditDialogInstance {
  open: () => void;
  // define other methods if any
}

const updateSlideshowThrottled = _.debounce((id: string, data: Partial<SlideshowData>) => {
  return updateSlideshow(id, data);
}, 300);

class Slideshow extends React.Component<SlideshowProps, SlideshowState> {
  private slideList = React.createRef<SlideListInstance>();
  private dialog = React.createRef<SlideEditDialogInstance>();

  constructor(props: SlideshowProps) {
    super(props);
    this.state = { slideshow: props.slideshow };
  }

  static async getInitialProps(ctx: NextPageContext): Promise<Partial<SlideshowProps>> {
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
            updateSlideshowThrottled(this.state.slideshow._id, { title: newTitle });
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
            value={(slideshow && slideshow.title) || ''} // Handle undefined case for value
            onChange={this.handleTitleChange}
            onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
            size={(slideshow && slideshow.title && slideshow.title.length) || 20} // Default size
          />
          <div className='icon'>
            <FontAwesomeIcon icon={faPencilAlt as IconDefinition} fixedWidth color='#828282' />
          </div>
        </div>
        <div className='wrapper'>
          <Upload slideshowId={slideshow && slideshow._id} refresh={this.refresh} />
          <SlideEditDialogComponent
            slideshowId={slideshow && slideshow._id}
            refresh={this.refresh}
            ref={this.dialog}
          />
          <Button
            text='Add a slide'
            color='#7bc043'
            style={{ flex: 1, margin: 0, width: '100%', marginTop: 20 }}
            onClick={this.openAddDialog}
          />
          <SlideListComponent ref={this.slideList} slideshowId={slideshow && slideshow._id} />
          {/* Assuming this Dialog is a generic one, e.g. for alerts, or context-based */}
          <Dialog /> 
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
