import React, { Component } from 'react';
import _ from 'lodash';

import Dialog, { IDialogProps } from '../Dialog'; // Assuming Dialog.tsx and its props
import { Form, Input, Button, ButtonGroup, IInputProps, IChoice } from '../Form'; // Assuming Form components are/will be typed

import { getSlide, addSlide, updateSlide, ISlideData, SlideAddData, SlideUpdateData } from '../../actions/slide'; // Slide actions are typed

// Interface for methods exposed via ref
export interface ISlideEditDialogRef {
  open: () => void;
  close: () => void;
  refreshSlideData: () => Promise<void>;
  // If the internal dialog ref also needs to be accessed, it would be here,
  // but generally, we want to expose only the minimal public API.
  // For the purpose of the ref in slideshow.tsx, these are the primary methods.
}

export interface ISlideEditDialogProps {
  slideId?: string; // ID of the slide to edit (if editing)
  slideshowId?: string; // ID of the slideshow to add this slide to (if adding)
  upload?: File | null; // For new photo uploads
  refresh?: () => void; // Callback after save/close to refresh parent list
  // OptionsComponent was passed from EditableWidget in the original JS but not used here.
  // It was also passed to WidgetEditDialog not SlideEditDialog.
  // This Dialog is for SLIDES. WidgetEditDialog is different.
}

interface ISlideEditDialogState extends Partial<Omit<ISlideData, '_id' | 'creator_id' | 'creation_date' | 'last_update' | 'slideshow_ids'>> {
  // Fields from ISlideData that are editable:
  // name?: string; // ISlideData might use 'name', original JS used 'title' in state.
  // type?: 'youtube' | 'web' | 'photo' | 'markdown' | string; // From ISlideData.type
  // data?: any; // URL or content
  // duration?: number;
  
  // State specific to this dialog's form handling:
  title?: string; // Corresponds to slide's name/title
  description?: string; // A field not explicitly in ISlideData, maybe for internal use or needs adding to ISlideData
  upload?: File | null; // Current file being uploaded/edited
  // type, data, duration are directly from ISlideData (via Partial)
}


class SlideEditDialog extends Component<ISlideEditDialogProps, ISlideEditDialogState> implements ISlideEditDialogRef {
  private dialog = React.createRef<Dialog>(); // Ref to Dialog.tsx component instance

  constructor(props: ISlideEditDialogProps) {
    super(props);
    this.state = {
      upload: props.upload || null,
      type: props.upload ? 'photo' : undefined, // Default to 'photo' if upload prop is present
      // Initialize other fields as undefined or from props if creating new
      title: undefined,
      description: undefined,
      data: undefined,
      duration: undefined,
    };
  }

  componentDidUpdate(prevProps: ISlideEditDialogProps) {
    // If the upload prop changes (e.g., a new file is selected in parent for editing)
    if (this.props.upload !== prevProps.upload) {
      this.setState({
        upload: this.props.upload,
        type: this.props.upload ? 'photo' : this.state.type, // Keep existing type if no new upload, or set to photo
      });
    }
    // If the slideId prop changes, it implies we might need to load a new slide's data.
    // However, the 'open' method calls 'refreshSlideData', which handles loading.
    // This ensures data is fresh when dialog opens, not just on prop change.
  }

  refreshSlideData = async (): Promise<void> => {
    const { slideId, upload } = this.props;
    if (slideId) {
      try {
        const slideData = await getSlide(slideId);
        this.setState({
          // Reset fields before populating from fetched data
           ...{ // Define properties explicitly to avoid conflicts
              data: undefined,
              title: undefined, // If title is used in state and maps to ISlideData.name
              description: undefined,
              duration: undefined,
              type: upload ? 'photo' : undefined, // Set type based on upload first
           },
           ...slideData, // Spread fetched data, which might override the above with actual values
           // Explicitly set 'type' and 'data' last if 'upload' dictates 'photo' logic.
           // If 'upload' is present, it's a photo, so 'data' should be undefined (it holds the URL for non-photo types).
           // If no upload, then use fetched slideData.type.
           type: upload ? 'photo' : slideData.type,
           data: upload ? undefined : slideData.data, // Clear data if it's a photo upload
           upload: upload || null, // Ensure upload is correctly set or null
        });
      } catch (error) {
        console.error("Failed to get slide data:", error);
        // Handle error, maybe set some state to show error message
      }
    } else {
      // Reset to default state for a new slide
      this.setState({
        data: undefined,
        title: undefined,
        description: undefined,
        type: upload ? 'photo' : 'youtube', // Default type for new slide
        duration: 5, // Default duration
        upload: upload || null,
      });
    }
  };

  // Public method exposed via ref
  public open = (): void => {
    this.refreshSlideData().then(() => {
      this.dialog.current?.open();
    });
  };

  // Public method exposed via ref
  public close = (): void => {
    this.dialog.current?.close();
    if (this.props.refresh) {
      this.props.refresh();
    }
  };

  handleChange = (name: string, value: any): void => {
    this.setState(prevState => ({
      ...prevState,
      [name]: value,
      // Clean up data if the type of slide changed
      ...(name === 'type' ? { data: '' } : {}),
    }), () => {
        // If type changed to 'photo', and there's an existing 'data' (URL), clear it.
        // The 'upload' field will handle the new photo.
        if (name === 'type' && this.state.type === 'photo' && typeof this.state.data === 'string' && this.state.data.startsWith('http')) {
            this.setState({ data: undefined });
        }
    });
  };
  
  // Handler specifically for the photo upload Input component
  handlePhotoChange = (name: string, value: File | string | null): void => {
    if (value instanceof File) {
        this.setState({ upload: value, data: undefined }); // New file takes precedence, clear existing data URL
    } else if (typeof value === 'string') {
        // This case might happen if the photo input somehow returns a URL string (e.g. existing photo)
        // However, typical file inputs provide File objects.
        // For existing photos, 'data' field should hold the URL, and 'upload' should be null.
        this.setState({ data: value, upload: null });
    } else {
        this.setState({ upload: null }); // Clear upload if value is null
    }
  }


  handleSave = async (): Promise<void> => {
    const { slideId, slideshowId } = this.props;
    const { upload, title, description, type, data, duration } = this.state;

    // Consolidate data for saving, picking only relevant fields
    // ISlideData uses 'name' for title, ensure mapping if state uses 'title'
    const slideDetails: Partial<ISlideData> = _.pickBy({
      name: title, // Map state.title to slide.name
      description: description, // If description is part of ISlideData
      type: type,
      data: (type === 'photo' && upload) ? undefined : data, // `data` field is for URL/text, not the file itself for 'photo' type if new upload
      duration: Number(duration) || 5, // Ensure duration is a number
    }, v => v !== undefined);


    try {
      if (slideshowId) { // Adding a new slide
        await addSlide(slideshowId, upload || null, slideDetails as SlideAddData); // Ensure upload is File | null
      } else if (slideId) { // Updating an existing slide
        await updateSlide(slideId, upload || null, slideDetails as SlideUpdateData); // Ensure upload is File | null
      }
      this.close(); // Close dialog and trigger refresh via this.close()
    } catch (error) {
      console.error('Failed to save slide:', error);
      // Handle save error (e.g., show message to user)
    }
  };
  
  // Choices for the 'type' select input
  private typeChoices: IChoice[] = [
    { id: 'youtube', label: 'Youtube Video' },
    { id: 'web', label: 'Web Page' },
    { id: 'photo', label: 'Photo' },
    { id: 'markdown', label: 'Markdown' }, // Added markdown as an option
  ];


  render() {
    // Destructure all relevant fields from state for the form
    const { data, title, description, duration, type = 'photo', upload } = this.state;
    
    // Determine the correct value for the photo input
    // If 'upload' (File object) exists, it's a new or changed photo.
    // If 'data' (string URL) exists and type is 'photo', it's an existing photo.
    const photoInputValue = upload ? upload : (type === 'photo' && typeof data === 'string' ? data : undefined);


    return (
      <Dialog ref={this.dialog}>
        <Form>
          <Input
            type={'select'}
            name={'type'}
            label={'Slide Type'}
            value={type}
            choices={this.typeChoices}
            onChange={this.handleChange}
          />
          {type === 'photo' ? (
            <Input
              type={'photo'} // This custom type should handle File objects and string URLs
              label={'Photo'}
              name={'upload'} // This input should update the 'upload' state field
              value={photoInputValue} // Pass the File object or existing URL string
              onChange={this.handlePhotoChange} // Use specific handler for photo
              inline={true}
            />
          ) : (
            <Input
              type={type === 'markdown' ? 'textarea' : 'text'} // Set type to 'textarea' for markdown
              label={type === 'web' ? 'Web URL' : type === 'youtube' ? 'Youtube URL' : type === 'markdown' ? 'Markdown Content' : 'Data'}
              name={'data'}
              value={data || ''} // Ensure value is not null/undefined for input
              onChange={this.handleChange}
            />
          )}
          <Input
            type={'number'}
            label={'Duration (seconds)'}
            name={'duration'}
            value={duration || ''} // Ensure value is not null/undefined
            placeholder={'e.g., 5'}
            onChange={this.handleChange}
          />
          <Input
            type={'text'}
            label={'Title (optional)'}
            name={'title'}
            value={title || ''}
            placeholder={'Enter a title for this slide...'}
            onChange={this.handleChange}
          />
          {/* Description field was in original JS state, assuming it's useful */}
          <Input
            type={'textarea'}
            label={'Description (optional)'}
            name={'description'}
            value={description || ''}
            placeholder={'Enter a short description...'}
            onChange={this.handleChange}
          />
        </Form>
        <ButtonGroup>
          <Button text={'Save'} color={'#8bc34a'} onClick={this.handleSave} />
          <Button text={'Cancel'} color={'#e85454'} onClick={this.close} />
        </ButtonGroup>
      </Dialog>
    );
  }
}

export default SlideEditDialog;
