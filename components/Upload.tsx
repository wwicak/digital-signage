import React, { Component } from "react";
import dynamic from "next/dynamic";
import ContentLoader from "react-content-loader";
import { FileRejection, DropzoneProps, DropEvent } from "react-dropzone"; // Import types

// Assuming SlideEditDialog.tsx exports ISlideEditDialogRef for its ref methods
import SlideEditDialog from "./Admin/SlideEditDialog";

/*
 * Dynamically import react-dropzone for client-side only
 * Ensure the path to react-dropzone is correct if it's different in your node_modules
 */
const DropzoneWithNoSSR = dynamic(
  () => import("react-dropzone"), // Default export for react-dropzone
  {
    ssr: false,
    loading: () => (
      <ContentLoader
        height={120}
        width={640}
        speed={2}
        backgroundColor='#f3f3f3'
        foregroundColor='#ecebeb'
      >
        <rect x='0' y='0' rx='5' ry='5' width='100%' height='100' />
      </ContentLoader>
    ),
  },
);

// Extend File type to include our custom preview property
interface IFileWithPreview extends File {
  preview?: string;
}

export interface IUploadProps {
  slideshowId: string; // ID of the slideshow to add the new slide to
  refresh?: () => void; // Callback to refresh a list after SlideEditDialog saves/closes
  // Props for Dropzone can be added here if needed, e.g., accept, maxSize
  accept?: DropzoneProps["accept"];
  maxSize?: number;
  multiple?: boolean; // Though current logic only uses the last file
}

interface IUploadState {
  lastFile: IFileWithPreview | null;
}

class Upload extends Component<IUploadProps, IUploadState> {
  // Ref to SlideEditDialog instance
  private dialogRef = React.createRef<SlideEditDialog>();

  constructor(props: IUploadProps) {
    super(props);
    this.state = {
      lastFile: null,
    };
  }

  /*
   * Note: It's good practice to revoke object URLs when they are no longer needed
   * to free up resources. This can be done in componentWillUnmount or when lastFile changes.
   */
  componentWillUnmount() {
    if (this.state.lastFile?.preview) {
      URL.revokeObjectURL(this.state.lastFile.preview);
    }
  }

  // Type for acceptedFiles is File[] which is compatible with FileWithPath[] from react-dropzone
  handleOnDropAccepted = (acceptedFiles: File[], _event: DropEvent): void => { // event param required by react-dropzone API but unused
    if (acceptedFiles.length > 0) {
      // Revoke previous object URL if it exists
      if (this.state.lastFile?.preview) {
        URL.revokeObjectURL(this.state.lastFile.preview);
      }

      const file = acceptedFiles[acceptedFiles.length - 1] as IFileWithPreview;
      /*
       * Create a preview URL
       * Check if createObjectURL is available (it should be in modern browsers)
       */
      if (URL && URL.createObjectURL) {
        file.preview = URL.createObjectURL(file);
      } else if (typeof window !== "undefined" && window.webkitURL) {
        // Fallback for older Safari
        file.preview = window.webkitURL.createObjectURL(file);
      } else {
        file.preview = undefined; // Or some placeholder/error state
      }

      this.setState({ lastFile: file }, () => {
        // Open the dialog after the file is set in state
        this.dialogRef.current?.open();
      });
    }
  };

  handleOnDropRejected = (
    rejectedFiles: FileRejection[],
    _event: DropEvent, // Required by react-dropzone API but unused
  ): void => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const file = rejection.file;
      const errors = rejection.errors || [];

      let errorMessage = `File "${file?.name || 'Unknown'}" was rejected:\n`;

      errors.forEach((error) => {
        switch (error.code) {
          case 'file-invalid-type':
            errorMessage += '• Invalid file type. Please select an image file (JPG, PNG, GIF, WebP, SVG, BMP, TIFF)\n';
            break;
          case 'file-too-large':
            errorMessage += '• File is too large. Maximum size is 10MB\n';
            break;
          case 'too-many-files':
            errorMessage += '• Only one file can be uploaded at a time\n';
            break;
          default:
            errorMessage += `• ${error.message}\n`;
        }
      });

      alert(errorMessage.trim());
    }
  };

  render() {
    const {
      slideshowId,
      refresh,
      accept = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
        'image/svg+xml': ['.svg'],
        'image/bmp': ['.bmp'],
        'image/tiff': ['.tiff', '.tif']
      },
      maxSize = 10 * 1024 * 1024, // 10MB default
      multiple = false,
    } = this.props;
    const { lastFile } = this.state;

    // Props for react-dropzone
    const dropzoneProps: DropzoneProps = {
      onDropAccepted: this.handleOnDropAccepted,
      onDropRejected: this.handleOnDropRejected,
      multiple: multiple,
      accept: accept, // e.g. 'image/*' or { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }
      ...(maxSize && { maxSize }),
    };

    return (
      <div>
        <SlideEditDialog
          slideshowId={slideshowId} // Pass slideshowId to know where to add the new slide
          upload={lastFile} // Pass the selected file (with preview) to the dialog
          refresh={refresh}
          ref={this.dialogRef}
          // slideId is not passed, so SlideEditDialog knows it's for a new slide
        />
        <DropzoneWithNoSSR {...dropzoneProps}>
          {({ getRootProps, getInputProps, isDragActive }) => {
            return (
              <div
                {...getRootProps()}
                className={`p-5 font-sans text-center rounded border-2 border-dashed border-gray-400 cursor-pointer bg-white outline-none transition-all duration-200 hover:border-blue-500 hover:bg-blue-50 ${
                  isDragActive ? "border-blue-500 bg-blue-50" : ""
                }`}
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p className='m-0 text-gray-600'>
                    Drop files here to add to the slideshow...
                  </p>
                ) : (
                  <p className='m-0 text-gray-600'>
                    Drag &apos;n&apos; drop some files here, or click to select
                    files to add to the slideshow.
                  </p>
                )}
              </div>
            );
          }}
        </DropzoneWithNoSSR>
      </div>
    );
  }
}

export default Upload;
