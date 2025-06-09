import React, { Component, ChangeEvent, KeyboardEvent, CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import ContentLoader from 'react-content-loader'

import ColorPicker from './ColorPicker' // Assuming ColorPicker.tsx

// --- Types and Interfaces ---
export interface IChoice {
  id: string | number;
  label: string;
  disabled?: boolean;
}

// Base props common to all input types
export interface IBaseInputProps {
  name: string; // Name of the input field, passed to onChange
  value?: any; // Current value of the input
  onChange: (
    name: string,
    value: any,
    event?: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | File // File for photo/upload
  ) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  inline?: boolean; // If true, label and input are more compact or side-by-side
  expand?: boolean; // If true, input tries to take more available space (e.g. flex: 1)
  helpText?: string; // Help text displayed below the input
  error?: string | boolean; // Error message or boolean to indicate error state
  className?: string; // Custom class for the input wrapper or input element itself
  style?: CSSProperties; // Custom style for the main input wrapper div
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

// Specific props for different input types
export interface ITextInputProps extends IBaseInputProps { type: 'text' | 'password' | 'email' | 'url' | 'search' | 'tel'; }
export interface INumberInputProps extends IBaseInputProps { type: 'number'; min?: number; max?: number; step?: number; }
export interface ITextAreaProps extends IBaseInputProps { type: 'textarea'; rows?: number; }
export interface ISelectProps extends IBaseInputProps { type: 'select'; choices: IChoice[]; }
export interface IColorInputProps extends IBaseInputProps { type: 'color'; } // Value is string (hex)
export interface ICheckboxProps extends IBaseInputProps { type: 'checkbox'; checked?: boolean; value?: string; } // Value for checkbox is often fixed, checked is the state
export interface IPhotoUploadProps extends IBaseInputProps {
  type: 'photo';
  accept?: string | Record<string, string[]>;
} // Value can be File or string (URL), accept can be string or object for react-dropzone

// Union type for all possible Input component props
export type IInputProps =
  | ITextInputProps
  | INumberInputProps
  | ITextAreaProps
  | ISelectProps
  | IColorInputProps
  | ICheckboxProps
  | IPhotoUploadProps;

// Dynamically import react-dropzone for client-side only
const DropzoneWithNoSSR = dynamic(
  () => import('react-dropzone').then(mod => mod.default), // Adjust if react-dropzone export is different
  {
    ssr: false,
    loading: () => (
      <ContentLoader height={80} width={400} speed={2} backgroundColor='#f3f3f3' foregroundColor='#ecebeb'>
        <rect x='0' y='0' rx='4' ry='4' width='100%' height='80' />
      </ContentLoader>
    ),
  }
)

class Input extends Component<IInputProps> {
  // Removed internal state for 'value'. This component will be fully controlled by props.

  // Generic handler for standard HTML input elements (input, textarea, select)
  handleHtmlInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, onChange } = this.props
    const target = event.target
    let value: string | number | boolean | undefined

    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked
    } else if (target.type === 'number') {
      value = (target as HTMLInputElement).valueAsNumber
      if(isNaN(value)) value = undefined // or props.value if want to revert, or ''
    }
     else {
      value = target.value
    }
    onChange(name, value, event)
  }

  // Handler for ColorPicker component
  handleColorChange = (colorHex: string): void => {
    const { name, onChange } = this.props
    onChange(name, colorHex)
  }

  /*
   * Handler for react-dropzone (photo upload)
   * react-dropzone v11+ onDrop type: (acceptedFiles: File[], rejectedFiles: FileRejection[], event: DropEvent) => void
   */
  handlePhotoDrop = (acceptedFiles: File[]): void => {
    const { name, onChange } = this.props
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      /*
       * Create a preview URL. Ensure to revoke it when component unmounts or file changes if it's a new preview.
       * For simplicity, assuming parent handles preview logic if it receives a File object.
       * The original code assigned a 'preview' property to the File object.
       * This is generally not recommended. It's better to manage previews in component state if needed.
       * (file as any).preview = URL.createObjectURL(file); // Avoid modifying File object prototype
       */
      
      /*
       * The original JS used 'upload' as the 'name' for onChange.
       * If this specific Input instance for photo has name="upload", it will pass 'upload'.
       * Otherwise, it passes its actual 'name' prop.
       */
      onChange(name, file, undefined) // Pass the File object
    }
  }

  handlePhotoDropRejected = (rejectedFiles: any[]): void => {
    // Using any[] for rejectedFiles as FileRejection type might need specific import from dropzone
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      const file = rejection?.file
      const errors = rejection?.errors || []

      let errorMessage = `File "${file?.name || 'Unknown'}" was rejected:\n`

      errors.forEach((error: any) => {
        switch (error.code) {
          case 'file-invalid-type':
            errorMessage += '• Invalid file type. Please select an image file (JPG, PNG, GIF, WebP, SVG, BMP, TIFF)\n'
            break
          case 'file-too-large':
            errorMessage += '• File is too large. Maximum size is 10MB\n'
            break
          case 'too-many-files':
            errorMessage += '• Only one file can be uploaded at a time\n'
            break
          default:
            errorMessage += `• ${error.message}\n`
        }
      })

      alert(errorMessage.trim())
    }
  }

  renderInput() {
    const { type, value, placeholder, disabled, onKeyDown, className, name, error } = this.props
    const hasError = typeof error === 'string' ? !!error : !!error

    const baseInputClasses = `font-sans text-gray-800 bg-gray-100 min-h-[40px] rounded border border-gray-300 outline-none px-3 py-2 text-base box-border w-full transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)] disabled:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70 ${hasError ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.25)]' : ''} ${className || ''}`

    switch (type) {
      case 'text':
      case 'password':
      case 'email':
      case 'url':
      case 'search':
      case 'tel':
        return (
          <input
            type={type}
            name={name}
            className={baseInputClasses}
            placeholder={placeholder}
            value={value || ''} // Ensure value is not null/undefined for input
            onChange={this.handleHtmlInputChange}
            disabled={disabled}
            onKeyDown={onKeyDown}
          />
        )
      case 'number':
        const numProps = this.props as INumberInputProps
        return (
          <input
            type='number'
            name={name}
            className={baseInputClasses}
            placeholder={placeholder}
            value={value === undefined || value === null || isNaN(value) ? '' : value} // Handle NaN for number input
            onChange={this.handleHtmlInputChange}
            disabled={disabled}
            onKeyDown={onKeyDown}
            min={numProps.min}
            max={numProps.max}
            step={numProps.step}
          />
        )
      case 'textarea':
        const taProps = this.props as ITextAreaProps
        return (
          <textarea
            name={name}
            className={`${baseInputClasses} resize-y min-h-[80px]`}
            value={value || ''}
            placeholder={placeholder}
            onChange={this.handleHtmlInputChange}
            disabled={disabled}
            onKeyDown={onKeyDown}
            rows={taProps.rows}
          />
        )
      case 'select':
        const selProps = this.props as ISelectProps
        return (
          <select
            name={name}
            onChange={this.handleHtmlInputChange}
            value={value || ''} // Ensure value is not null/undefined
            className={`${baseInputClasses} appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_.7em_top_50%,_0_0] bg-[.65em_auto,_100%] pr-10`}
            disabled={disabled}
            onKeyDown={onKeyDown}
          >
            <option value={''} disabled={selProps.placeholder === undefined}>
              {selProps.placeholder || 'Choose an option...'}
            </option>
            {selProps.choices.map(choice => (
              <option key={choice.id} value={choice.id} disabled={choice.disabled}>
                {choice.label}
              </option>
            ))}
          </select>
        )
      case 'color':
        return <ColorPicker color={value as string} onChange={this.handleColorChange} />
      case 'checkbox':
        const cbProps = this.props as ICheckboxProps
        return (
            <input
                type='checkbox'
                name={name}
                className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed ${className || ''}`}
                checked={!!cbProps.checked} // Use the checked prop
                onChange={this.handleHtmlInputChange} // This will pass boolean for 'checked'
                disabled={disabled}
                value={cbProps.value || 'on'} // Actual value attribute for checkbox if needed by form
            />
        )
      case 'photo':
        const photoProps = this.props as IPhotoUploadProps
        /*
         * `value` for photo can be a string (URL of existing image) or a File object (new upload)
         * Dropzone typically handles display of preview or existing image.
         */
        return (
          <DropzoneWithNoSSR
            onDropAccepted={this.handlePhotoDrop}
            onDropRejected={this.handlePhotoDropRejected}
            multiple={false}
            accept={photoProps.accept || {
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
              'image/gif': ['.gif'],
              'image/webp': ['.webp'],
              'image/svg+xml': ['.svg'],
              'image/bmp': ['.bmp'],
              'image/tiff': ['.tiff', '.tif']
            }}
            maxSize={10 * 1024 * 1024} // 10MB max file size
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div {...getRootProps()} className={`flex flex-col items-center justify-center cursor-pointer outline-none border-2 border-dashed border-gray-300 bg-gray-50 text-center min-h-[80px] p-4 rounded transition-colors duration-200 ${isDragActive ? 'border-blue-500 bg-blue-50' : ''} ${hasError ? 'border-red-500' : ''}`}>
                <input {...getInputProps()} />
                {isDragActive ? (
                  <div className='font-sans text-gray-600'>Drop the photo here...</div>
                ) : (value && typeof value === 'string') ? ( // If value is a URL string
                  <div className='flex flex-col items-center text-center'>
                    <div className='h-16 w-16 rounded border border-gray-300 mb-2 bg-contain bg-no-repeat bg-center' style={{ backgroundImage: `url(${value})` }} />
                    <span className='mt-2 overflow-hidden whitespace-nowrap text-ellipsis max-w-full text-sm text-gray-800'>{value}</span>
                  </div>
                ) : (value && value instanceof File) ? ( // If value is a File object (preview usually handled by parent or via FileReader)
                     <div className='flex flex-col items-center text-center'>
                        <span className='mt-2 overflow-hidden whitespace-nowrap text-ellipsis max-w-full text-sm text-gray-800'>{(value as File).name} (New)</span>
                     </div>
                ) : (
                  <div className='font-sans text-gray-600'>Drag &apos;n&apos; drop a photo here, or click to select</div>
                )}
              </div>
            )}
          </DropzoneWithNoSSR>
        )
      default: // Should be textarea as per original JS
        return (
          <textarea
            name={name}
            className={className}
            value={value || ''}
            placeholder={placeholder}
            onChange={this.handleHtmlInputChange}
            disabled={disabled}
            onKeyDown={onKeyDown}
          />
        )
    }
  }

  render() {
    const { label, inline = false, expand = true, helpText, error, style } = this.props

    // Determine error state for styling
    const hasError = typeof error === 'string' ? !!error : !!error

    return (
      <div
        className={`mb-4 flex ${inline ? 'flex-row items-center' : 'flex-col items-stretch'} ${expand ? 'flex-1' : ''}`}
        style={style}
      >
        {label && (
          <label
            htmlFor={this.props.name}
            className={`text-gray-500 font-sans text-sm leading-relaxed ${inline ? 'mr-4 min-w-[100px] max-w-[150px] inline-block' : 'pb-2'}`}
          >
            {label}
          </label>
        )}
        <div className={`flex flex-col ${expand ? 'flex-1' : ''}`}>
          {this.renderInput()}
          {helpText && !hasError && <small className='text-sm text-gray-500 mt-1 block'>{helpText}</small>}
          {typeof error === 'string' && hasError && <small className='text-sm text-red-500 mt-1 block'>{error}</small>}
        </div>

      </div>
    )
  }
}

export default Input
