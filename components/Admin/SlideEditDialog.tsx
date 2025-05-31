import React, { Component } from 'react';
import _ from 'lodash';

import Dialog, { IDialogProps, DialogMethods } from '../Dialog'; // Assuming Dialog.tsx and its props
import { Form, Input, Button, ButtonGroup, IInputProps, IChoice } from '../Form'; // Assuming Form components are/will be typed

import { getSlide, addSlide, updateSlide, ISlideData, SlideAddData, SlideUpdateData, SlideActionDataSchema } from '../../actions/slide'; // Slide actions are typed
import { SlideType, SlideData, SlideTypeZod, SlideDataZod } from '../../api/models/Slide';
import * as z from 'zod';

// Interface for methods exposed via ref - Zod is not typically used for ref method signatures
export interface ISlideEditDialogRef {
  open: () => void;
  close: () => void;
  refreshSlideData: () => Promise<void>;
}

// Zod schema for SlideEditDialog props
export const SlideEditDialogPropsSchema = z.object({
  slideId: z.string().optional(),
  slideshowId: z.string().optional(),
  upload: z.instanceof(File).nullable().optional(),
  refresh: z.function(z.tuple([]), z.void()).optional(),
});
export type ISlideEditDialogProps = z.infer<typeof SlideEditDialogPropsSchema>;

// Zod schema for SlideEditDialog state
// This reflects the form fields and data being edited.
const SlideEditDialogStateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  upload: z.instanceof(File).nullable().optional(), // For new file uploads
  // 'data' can be a string (URL for web/youtube) or structured SlideData for other types (though often simplified to string input).
  // For 'photo' type, this 'data' field might hold the existing image URL if not a new 'upload'.
  data: z.union([z.string(), SlideDataZod]).optional(),
  type: SlideTypeZod.optional(),
  duration: z.number().optional(),
  // Include other fields from ISlideData if they are directly managed in the state and form
  // Example: is_enabled: z.boolean().optional(),
});
type ISlideEditDialogState = z.infer<typeof SlideEditDialogStateSchema>;

class SlideEditDialog extends Component<ISlideEditDialogProps, ISlideEditDialogState> implements ISlideEditDialogRef {
  private dialog = React.createRef<DialogMethods>(); // Ref to Dialog.tsx component instance

  constructor(props: ISlideEditDialogProps) {
    super(props);
    this.state = {
      upload: props.upload || null,
      type: props.upload ? SlideType.PHOTO : undefined, // Default to 'photo' if upload prop is present
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
        type: this.props.upload ? SlideType.PHOTO : this.state.type, // Keep existing type if no new upload, or set to photo
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
           type: upload ? SlideType.PHOTO : slideData.type,
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
        type: upload ? SlideType.PHOTO : SlideType.YOUTUBE, // Default type for new slide
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
    this.setState(prevState => {
      const newState = {
        ...prevState,
        [name]: value,
      } as ISlideEditDialogState; // Cast to assure TypeScript
      // Clean up data if the type of slide changed
      if (name === 'type') {
        newState.data = undefined; // Clear data when type changes
      }
      return newState;
    }, () => {
        if (name === 'type' && this.state.type === SlideType.PHOTO && typeof this.state.data === 'string' && this.state.data?.startsWith('http')) {
            this.setState({ data: undefined });
        }
    });
  };
  
  // Handler specifically for the photo upload Input component
  handlePhotoChange = (name: string, value: File | string | null): void => {
    // 'name' would typically be 'upload' or 'data' depending on Input component's design
    if (value instanceof File) {
        this.setState({ upload: value, data: undefined });
    } else if (typeof value === 'string') {
        // This implies the input returned an existing URL, so it's not a new file upload.
        this.setState({ data: value, upload: null });
    } else {
        // Value is null (e.g., photo cleared)
        this.setState({ upload: null, data: undefined }); // Clear both upload and any existing data URL if type is photo
    }
  }


  handleSave = async (): Promise<void> => {
    const { slideId, slideshowId } = this.props;
    const { upload, title, description, type, data, duration } = this.state;

    // Constructing slideDetails for saving.
    // This object should conform to what `addSlide` or `updateSlide` expects for their metadata argument.
    // SlideAddData and SlideUpdateData are Omit<Partial<ISlideData>, ...>
    // We need to ensure the built object is compatible.
    let slideDetailsPayload: Partial<ISlideData> = {
        name: title,
        description: description, // Assuming description is part of ISlideData or handled by backend
        type: type,
        duration: Number(duration) || 5,
    };

    // Handle the 'data' field based on type
    if (type === SlideType.PHOTO) {
        // If it's a photo, the 'data' field in the database usually stores the URL.
        // If a new 'upload' is present, the backend will handle creating the URL.
        // If no new 'upload', and 'this.state.data' is a string (existing URL), it should be preserved.
        // The `updateSlide` and `addSlide` actions take `upload` (File) separately.
        // The `data` field in `slideDetailsPayload` here should be for non-file data.
        if (upload) { // New file being uploaded
            slideDetailsPayload.data = undefined; // Backend will generate new URL/data from file
        } else if (typeof data === 'string' && data.startsWith('http')) { // Existing photo URL
            slideDetailsPayload.data = data as any;
        } else {
             slideDetailsPayload.data = undefined; // Or handle as error if photo type has no data/upload
        }
    } else {
        // For other types, 'data' is directly from state (e.g., URL for youtube/web, content for markdown)
        slideDetailsPayload.data = data as any;
    }

    // Filter out undefined values before sending
    slideDetailsPayload = _.pickBy(slideDetailsPayload, v => v !== undefined) as Partial<ISlideData>;


    try {
      if (slideshowId) { // Adding a new slide
        await addSlide(slideshowId, upload || null, slideDetailsPayload as SlideAddData);
      } else if (slideId) { // Updating an existing slide
        await updateSlide(slideId, upload || null, slideDetailsPayload as SlideUpdateData);
      }
      this.close();
    } catch (error) {
      console.error('Failed to save slide:', error);
      // Handle save error (e.g., show message to user)
    }
  };
  
  // Choices for the 'type' select input
  private typeChoices: IChoice[] = [
    { id: SlideType.YOUTUBE, label: 'Youtube Video' },
    { id: SlideType.WEB, label: 'Web Page' },
    { id: SlideType.PHOTO, label: 'Photo' },
    { id: SlideType.MARKDOWN, label: 'Markdown' }, // Added markdown as an option
  ];


  render() {
    // Destructure all relevant fields from state for the form
    const { data, title, description, duration, type = SlideType.PHOTO, upload } = this.state;
    
    // Determine the correct value for the photo input
    // If 'upload' (File object) exists, it's a new or changed photo.
    // If 'data' (string URL) exists and type is 'photo', it's an existing photo.
    const photoInputValue = upload ? upload : (type === SlideType.PHOTO && typeof data === 'string' ? data : undefined);


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
          {type === SlideType.PHOTO ? (
            <Input
              type={SlideType.PHOTO} // This custom type should handle File objects and string URLs
              label={'Photo'}
              name={'upload'} // This input should update the 'upload' state field
              value={photoInputValue} // Pass the File object or existing URL string
              onChange={this.handlePhotoChange} // Use specific handler for photo
              inline={true}
            />
          ) : (
            <Input
              type={type === SlideType.MARKDOWN ? 'textarea' : 'text'} // Set type to 'textarea' for markdown
              label={type === SlideType.WEB ? 'Web URL' : type === SlideType.YOUTUBE ? 'Youtube URL' : type === SlideType.MARKDOWN ? 'Markdown Content' : 'Data'}
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
