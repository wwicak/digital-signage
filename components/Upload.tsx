import React, { Component } from 'react'
import dynamic from 'next/dynamic'
import ContentLoader from 'react-content-loader'
import { FileRejection, DropzoneProps, DropEvent } from 'react-dropzone' // Import types

// Assuming SlideEditDialog.tsx exports ISlideEditDialogRef for its ref methods
import SlideEditDialog, { ISlideEditDialogRef } from './Admin/SlideEditDialog'

/*
 * Dynamically import react-dropzone for client-side only
 * Ensure the path to react-dropzone is correct if it's different in your node_modules
 */
const DropzoneWithNoSSR = dynamic(
  () => import('react-dropzone'), // Default export for react-dropzone
  {
    ssr: false,
    loading: () => (
      <ContentLoader height={120} width={640} speed={2} backgroundColor='#f3f3f3' foregroundColor='#ecebeb'>
        <rect x='0' y='0' rx='5' ry='5' width='100%' height='100' />
      </ContentLoader>
    ),
  }
)

// Extend File type to include our custom preview property
interface IFileWithPreview extends File {
  preview?: string;
}

export interface IUploadProps {
  slideshowId: string; // ID of the slideshow to add the new slide to
  refresh?: () => void; // Callback to refresh a list after SlideEditDialog saves/closes
  // Props for Dropzone can be added here if needed, e.g., accept, maxSize
  accept?: DropzoneProps['accept'];
  maxSize?: number;
  multiple?: boolean; // Though current logic only uses the last file
}

interface IUploadState {
  lastFile: IFileWithPreview | null;
}

class Upload extends Component<IUploadProps, IUploadState> {
  // Ref to SlideEditDialog instance
  private dialogRef = React.createRef<SlideEditDialog>()

  constructor(props: IUploadProps) {
    super(props)
    this.state = {
      lastFile: null,
    }
  }
  
  /*
   * Note: It's good practice to revoke object URLs when they are no longer needed
   * to free up resources. This can be done in componentWillUnmount or when lastFile changes.
   */
  componentWillUnmount() {
      if (this.state.lastFile?.preview) {
          URL.revokeObjectURL(this.state.lastFile.preview)
      }
  }

  // Type for acceptedFiles is File[] which is compatible with FileWithPath[] from react-dropzone
  handleOnDropAccepted = (acceptedFiles: File[], event: DropEvent): void => {
    if (acceptedFiles.length > 0) {
      // Revoke previous object URL if it exists
      if (this.state.lastFile?.preview) {
        URL.revokeObjectURL(this.state.lastFile.preview)
      }

      const file = acceptedFiles[acceptedFiles.length - 1] as IFileWithPreview
      /*
       * Create a preview URL
       * Check if createObjectURL is available (it should be in modern browsers)
       */
      if (URL && URL.createObjectURL) {
        file.preview = URL.createObjectURL(file)
      } else if (typeof window !== 'undefined' && window.webkitURL) {
        // Fallback for older Safari
        file.preview = window.webkitURL.createObjectURL(file)
      } else {
        file.preview = undefined // Or some placeholder/error state
      }

      this.setState({ lastFile: file }, () => {
        // Open the dialog after the file is set in state
        this.dialogRef.current?.open()
      })
    }
  }

  handleOnDropRejected = (rejectedFiles: FileRejection[], event: DropEvent): void => {
    if (rejectedFiles.length > 0) {
      /*
       * Get the file name from the first rejected file.
       * rejectedFiles[0] is an object { file: File, errors: Error[] }
       */
      const firstRejectedFile = rejectedFiles[0].file
      const fileName = firstRejectedFile?.name || 'this file type'
      alert(`File type not allowed or file too large: ${fileName}`)
    }
  }

  render() {
    const { slideshowId, refresh, accept = {'image/*': []}, maxSize, multiple = false } = this.props
    const { lastFile } = this.state

    // Props for react-dropzone
    const dropzoneProps: DropzoneProps = {
      onDropAccepted: this.handleOnDropAccepted,
      onDropRejected: this.handleOnDropRejected,
      multiple: multiple,
      accept: accept, // e.g. 'image/*' or { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }
      ...(maxSize && { maxSize }),
    }

    return (
      <div className='upload-widget-container'>
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
              <div {...getRootProps()} className={`upload-dropzone-area ${isDragActive ? 'active' : ''}`}> {/* Renamed class */}
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p>Drop files here to add to the slideshow...</p>
                ) : (
                  <p>Drag 'n' drop some files here, or click to select files to add to the slideshow.</p> // More descriptive
                )}
              </div>
            )
          }}
        </DropzoneWithNoSSR>
        <style jsx>
          {`
            .upload-widget-container { /* Renamed */
              /* Add any container specific styles if needed */
            }
            .upload-dropzone-area { /* Renamed */
              padding: 20px;
              font-family: 'Open Sans', sans-serif;
              text-align: center;
              border-radius: 4px;
              border: 2px dashed #adadad;
              cursor: pointer;
              background: white;
              outline: none;
              transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out;
            }
            .upload-dropzone-area.active {
                border-color: #358aed;
                background-color: #f0f8ff;
            }
            .upload-dropzone-area p { /* Style paragraph inside dropzone */
                margin: 0;
                color: #555;
            }
          `}
        </style>
      </div>
    )
  }
}

export default Upload
