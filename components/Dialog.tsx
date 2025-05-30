import React, { ReactNode } from 'react';
import Modal, { Styles as ReactModalStyles } from 'react-modal';

// Define the structure for the style prop, which merges with react-modal's styles
interface IDialogModalStyles extends ReactModalStyles {
  // No additional custom style parts defined here, but can be extended
}

const modalStyles: IDialogModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    border: 'none',
    maxHeight: '80vh',
    overflowY: 'auto',
    padding: '20px', // Default padding, can be overridden by props.style.content
  },
  overlay: { zIndex: 3, backgroundColor: 'rgba(0,0, 0, 0.6)' },
};

export interface IDialogProps {
  children: ReactNode;
  style?: Partial<IDialogModalStyles>; // Allow overriding parts of modalStyles
  // Props from task description that imply a controlled component (not current behavior)
  // isOpen?: boolean;
  // onClose?: () => void;
  // title?: string;
  // noPadding?: boolean;
  // width?: string | number;
  // height?: string | number;
  // actions?: ReactNode;
}

interface IDialogState {
  modalIsOpen: boolean;
}

class Dialog extends React.Component<IDialogProps, IDialogState> {
  constructor(props: IDialogProps) {
    super(props);

    this.state = {
      modalIsOpen: false,
    };
  }

  // Public method to open the dialog (callable via ref)
  public open = (e?: React.MouseEvent | React.KeyboardEvent): void => {
    if (e) e.stopPropagation();
    this.setState({ modalIsOpen: true });
  };

  // Public method to close the dialog (callable via ref)
  public close = (e?: React.MouseEvent | React.KeyboardEvent): void => {
    if (e) e.stopPropagation();
    this.setState({ modalIsOpen: false });
  };

  render() {
    const { children, style = {} } = this.props;

    // Deep merge custom styles with default modalStyles
    // ReactModal's style prop expects 'content' and 'overlay' keys.
    const mergedStyles: IDialogModalStyles = {
        overlay: { ...modalStyles.overlay, ...style.overlay },
        content: { ...modalStyles.content, ...style.content },
    };

    return (
      // The outer 'container' div seems to serve no purpose if this component's
      // only job is to render a Modal. The Modal itself is portalled.
      // Keeping it for now to match original structure, but it might be removable.
      <div className='container'> 
        <Modal
          isOpen={this.state.modalIsOpen}
          onRequestClose={this.close}
          style={mergedStyles}
          ariaHideApp={false} // Recommended to set this to your app element for accessibility
          shouldCloseOnOverlayClick={true} // Default, but good to be explicit
        >
          {/* The 'form' className div might be too specific if children are not always a form */}
          <div className='dialog-content-wrapper'>{children}</div>
        </Modal>
        <style jsx>{`
          .container {
            /* This style is likely not affecting the modal dialog itself, 
               as Modal components are typically portalled to the body root. 
               If this container is meant to wrap the component that triggers the dialog, 
               it's fine, but it doesn't style the dialog. */
            display: inline-block; /* Changed from flex to be less imposing if it wraps a button */
          }

          .dialog-content-wrapper {
            display: flex;
            flex-direction: column;
          }
        `}</style>
      </div>
    );
  }
}

export default Dialog;
