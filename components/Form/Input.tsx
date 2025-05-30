import React, { Component, ChangeEvent, KeyboardEvent, ReactNode, CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import ContentLoader from 'react-content-loader';

import ColorPicker, { IColorPickerProps } from './ColorPicker'; // Assuming ColorPicker.tsx

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
export interface IPhotoUploadProps extends IBaseInputProps { type: 'photo'; accept?: string; } // Value can be File or string (URL)

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
      <ContentLoader height={80} width={400} speed={2} primaryColor="#f3f3f3" secondaryColor="#ecebeb">
        <rect x="0" y="0" rx="4" ry="4" width="100%" height="80" />
      </ContentLoader>
    ),
  }
);


class Input extends Component<IInputProps> {
  // Removed internal state for 'value'. This component will be fully controlled by props.

  // Generic handler for standard HTML input elements (input, textarea, select)
  handleHtmlInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, onChange } = this.props;
    const target = event.target;
    let value: string | number | boolean | undefined;

    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else if (target.type === 'number') {
      value = (target as HTMLInputElement).valueAsNumber;
      if(isNaN(value)) value = undefined; // or props.value if want to revert, or ''
    }
     else {
      value = target.value;
    }
    onChange(name, value, event);
  };

  // Handler for ColorPicker component
  handleColorChange = (colorHex: string): void => {
    const { name, onChange } = this.props;
    onChange(name, colorHex);
  };

  // Handler for react-dropzone (photo upload)
  // react-dropzone v11+ onDrop type: (acceptedFiles: File[], rejectedFiles: FileRejection[], event: DropEvent) => void
  handlePhotoDrop = (acceptedFiles: File[]): void => {
    const { name, onChange } = this.props;
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Create a preview URL. Ensure to revoke it when component unmounts or file changes if it's a new preview.
      // For simplicity, assuming parent handles preview logic if it receives a File object.
      // The original code assigned a 'preview' property to the File object.
      // This is generally not recommended. It's better to manage previews in component state if needed.
      // (file as any).preview = URL.createObjectURL(file); // Avoid modifying File object prototype
      
      // The original JS used 'upload' as the 'name' for onChange.
      // If this specific Input instance for photo has name="upload", it will pass 'upload'.
      // Otherwise, it passes its actual 'name' prop.
      onChange(name, file, undefined); // Pass the File object
    }
  };

  handlePhotoDropRejected = (rejectedFiles: any[]): void => {
    // Using any[] for rejectedFiles as FileRejection type might need specific import from dropzone
    if (rejectedFiles.length > 0) {
      // Get the specific file object from the rejection if possible
      const firstRejectedFile = rejectedFiles[0]?.file || rejectedFiles[0];
      const fileName = firstRejectedFile?.name || 'this file type';
      alert(`File type not allowed: ${fileName}`);
    }
  };


  renderInput() {
    const { type, value, placeholder, disabled, onKeyDown, className, name } = this.props;

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
            className={className}
            placeholder={placeholder}
            value={value || ''} // Ensure value is not null/undefined for input
            onChange={this.handleHtmlInputChange}
            disabled={disabled}
            onKeyDown={onKeyDown}
          />
        );
      case 'number':
        const numProps = this.props as INumberInputProps;
        return (
          <input
            type="number"
            name={name}
            className={className}
            placeholder={placeholder}
            value={value === undefined || value === null || isNaN(value) ? '' : value} // Handle NaN for number input
            onChange={this.handleHtmlInputChange}
            disabled={disabled}
            onKeyDown={onKeyDown}
            min={numProps.min}
            max={numProps.max}
            step={numProps.step}
          />
        );
      case 'textarea':
        const taProps = this.props as ITextAreaProps;
        return (
          <textarea
            name={name}
            className={className}
            value={value || ''}
            placeholder={placeholder}
            onChange={this.handleHtmlInputChange}
            disabled={disabled}
            onKeyDown={onKeyDown}
            rows={taProps.rows}
          />
        );
      case 'select':
        const selProps = this.props as ISelectProps;
        return (
          <select
            name={name}
            onChange={this.handleHtmlInputChange}
            value={value || ''} // Ensure value is not null/undefined
            className={className}
            disabled={disabled}
            onKeyDown={onKeyDown}
          >
            <option value={""} disabled={selProps.placeholder === undefined}>
              {selProps.placeholder || 'Choose an option...'}
            </option>
            {selProps.choices.map(choice => (
              <option key={choice.id} value={choice.id} disabled={choice.disabled}>
                {choice.label}
              </option>
            ))}
          </select>
        );
      case 'color':
        return <ColorPicker color={value as string} onChange={this.handleColorChange} />;
      case 'checkbox':
        const cbProps = this.props as ICheckboxProps;
        return (
            <input
                type="checkbox"
                name={name}
                className={className}
                checked={!!value} // Checkbox checked state is boolean
                onChange={this.handleHtmlInputChange} // This will pass boolean for 'checked'
                disabled={disabled}
                value={cbProps.value || 'on'} // Actual value attribute for checkbox if needed by form
            />
        );
      case 'photo':
        const photoProps = this.props as IPhotoUploadProps;
        // `value` for photo can be a string (URL of existing image) or a File object (new upload)
        // Dropzone typically handles display of preview or existing image.
        return (
          <DropzoneWithNoSSR
            onDropAccepted={this.handlePhotoDrop}
            onDropRejected={this.handlePhotoDropRejected}
            multiple={false}
            accept={photoProps.accept || 'image/*'}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div {...getRootProps()} className={`upload-dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                {isDragActive ? (
                  <div className={'photo-upload-text'}>Drop the photo here...</div>
                ) : (value && typeof value === 'string') ? ( // If value is a URL string
                  <div className={'photo-preview-container'}>
                    <div className={'thumbnail'} style={{ backgroundImage: `url(${value})` }} />
                    <span className={'link-text'}>{value}</span>
                  </div>
                ) : (value && value instanceof File) ? ( // If value is a File object (preview usually handled by parent or via FileReader)
                     <div className={'photo-preview-container'}>
                        <span className={'link-text'}>{(value as File).name} (New)</span>
                     </div>
                ) : (
                  <div className={'photo-upload-text'}>Drag 'n' drop a photo here, or click to select</div>
                )}
              </div>
            )}
          </DropzoneWithNoSSR>
        );
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
        );
    }
  }

  render() {
    const { label, inline = true, expand = true, helpText, error, style } = this.props;

    // Determine error state for styling
    const hasError = typeof error === 'string' ? !!error : !!error;

    return (
      <div
        className={`input-group-wrapper ${inline ? 'inline' : 'block'} ${expand ? 'expand' : ''} ${hasError ? 'has-error' : ''}`}
        style={style}
      >
        {label && <label htmlFor={this.props.name}>{label}</label>}
        <div className="input-field-container">
          {this.renderInput()}
          {helpText && !hasError && <small className="help-text">{helpText}</small>}
          {typeof error === 'string' && hasError && <small className="error-text">{error}</small>}
        </div>
        {/* Original JSX styles were complex and dependent on props.inline and props.expand.
            It's generally better to handle these with more structured CSS or utility classes.
            For now, providing a basic structure. Specific styling for inline, expand will be minimal here.
        */}
        <style jsx>{`
          .input-group-wrapper {
            margin-bottom: 16px;
            display: flex; /* Default to flex for inline/block behavior */
            /* flex-direction and justify-content will depend on 'inline' prop */
          }
          .input-group-wrapper.inline {
            flex-direction: row;
            align-items: center; /* Align label and input field nicely */
          }
          .input-group-wrapper.block {
            flex-direction: column;
            align-items: stretch; /* Make label and input take full width */
          }
          
          .input-group-wrapper.expand .input-field-container {
            flex: 1; /* Allow input field container to expand */
          }
          .input-group-wrapper.expand input,
          .input-group-wrapper.expand textarea,
          .input-group-wrapper.expand select,
          .input-group-wrapper.expand .upload-dropzone {
            min-width: 0; /* Override min-width from original if expanding */
            width: 100%; /* Take full width if expanding */
          }


          label {
            margin-right: ${inline ? '16px' : '0'};
            color: #878787;
            font-family: 'Open Sans', sans-serif;
            min-width: ${inline ? '100px' : 'auto'}; /* Adjust label width for inline */
            max-width: ${inline ? '150px' : 'none'};
            display: inline-block; /* Or block if not inline */
            padding-top: ${inline ? '0' : '0'}; /* Adjusted based on alignment */
            padding-bottom: ${inline ? '0' : '8px'}; /* Space below label in block mode */
            font-size: 0.9em;
            line-height: 1.4;
          }
          
          .input-field-container {
            display: flex;
            flex-direction: column;
            /* min-width for expand was in original style for input itself, now on container for expand */
          }
          .input-field-container.expand {
            flex: 1;
          }


          /* Base styles for input, textarea, select - from original */
          :global(.input-group-wrapper input), /* Using :global as these are direct children now */
          :global(.input-group-wrapper textarea),
          :global(.input-group-wrapper select),
          .upload-dropzone { /* Dropzone is a div, can be styled directly */
            font-family: 'Open Sans', sans-serif;
            color: #333;
            background-color: #f7f7f7;
            min-height: 40px;
            border-radius: 4px; /* Unified border radius */
            border: 1px solid #ddd; /* Unified border */
            outline: none;
            padding: 8px 12px; /* Unified padding */
            font-size: 16px;
            box-sizing: border-box;
            width: 100%; /* Default to full width of its container */
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          :global(.input-group-wrapper input:focus),
          :global(.input-group-wrapper textarea:focus),
          :global(.input-group-wrapper select:focus) {
            border-color: #358aed; /* Highlight color */
            box-shadow: 0 0 0 2px rgba(53, 138, 237, 0.2);
          }

          :global(.input-group-wrapper input:disabled),
          :global(.input-group-wrapper textarea:disabled),
          :global(.input-group-wrapper select:disabled) {
            background-color: #e9ecef; /* Standard disabled color */
            cursor: not-allowed;
            opacity: 0.7;
          }

          :global(.input-group-wrapper textarea) {
            resize: vertical;
            min-height: 80px; /* Default min-height for textareas */
          }

          :global(.input-group-wrapper select) {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E');
            background-repeat: no-repeat;
            background-position: right .7em top 50%, 0 0;
            background-size: .65em auto, 100%;
            padding-right: 2.5em; /* Space for arrow */
          }
          
          /* Styles for 'photo' type with react-dropzone */
          .upload-dropzone {
            display: flex;
            flex-direction: column; /* Changed for vertical stacking of preview/text */
            align-items: center;
            justify-content: center;
            cursor: pointer;
            outline: none;
            border: 2px dashed #ccc;
            background: #fafafa;
            text-align: center;
            min-height: 80px; /* Min height for dropzone */
            padding: 16px;
          }
          .upload-dropzone.active {
            border-color: #358aed;
            background-color: #f0f8ff;
          }
          .photo-preview-container { /* Renamed from .photo */
            display: flex;
            flex-direction: column; /* Stack thumbnail and link */
            align-items: center;
            text-align: center;
          }
          .photo-upload-text { /* Renamed from .photo-upload */
            font-family: 'Open Sans', sans-serif;
            color: #555;
          }
          .link-text { /* Renamed from .link */
            margin-top: 8px; /* Space from thumbnail */
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            max-width: 100%; /* Max width within dropzone */
            font-size: 0.9em;
            color: #333;
          }
          .thumbnail {
            height: 60px; /* Larger thumbnail preview */
            width: 60px;
            border-radius: 4px;
            background-size: contain; /* Changed to contain for better preview */
            background-repeat: no-repeat;
            background-position: center;
            border: 1px solid #ddd;
            margin-bottom: 8px; /* If link text is below */
          }
          .help-text {
            font-size: 0.85em;
            color: #6c757d;
            margin-top: 4px;
            display: block;
          }
          .error-text {
            font-size: 0.85em;
            color: #dc3545; /* Bootstrap danger color */
            margin-top: 4px;
            display: block;
          }
          .input-group-wrapper.has-error input,
          .input-group-wrapper.has-error textarea,
          .input-group-wrapper.has-error select {
            border-color: #dc3545;
          }
          .input-group-wrapper.has-error input:focus,
          .input-group-wrapper.has-error textarea:focus,
          .input-group-wrapper.has-error select:focus {
            border-color: #dc3545;
            box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
          }

        `}</style>
      </div>
    );
  }
}

export default Input;
