import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AnnouncementOptions from '../../../widgets/announcement/src/AnnouncementOptions';
import { IAnnouncementWidgetData } from '../../../widgets/announcement/src/AnnouncementContent'; // Use the specific data type from content

// Adjusted mockDefaultData to align with IAnnouncementWidgetData and component's state/props
const mockInitialData: IAnnouncementWidgetData = {
  title: 'Default Title From Options Test', // This is for the 'title' input field
  text: 'Default message text.',           // This is for the 'text' textarea
  color: '#FFFFFF',                        // Background color
  textColor: '#333333',                    // Main text color
  titleTextColor: '#000000',               // Title bar text color
  accentColor: '#EDC951',                  // Accent color
};

describe('AnnouncementOptions Component', () => {
  let mockOnChange: jest.Mock;

  beforeEach(() => {
    mockOnChange = jest.fn();
  });

  // Pass data that matches IAnnouncementWidgetData structure
  const renderComponent = (data: Partial<IAnnouncementWidgetData> = {}) => {
    const initialData = { ...mockInitialData, ...data };
    return render(
      <AnnouncementOptions data={initialData} onChange={mockOnChange} widgetType="ANNOUNCEMENT" />
    );
  };

  it('should display initial data in form fields', () => {
    renderComponent();
    // Corrected labels based on AnnouncementOptions.tsx
    expect(screen.getByLabelText("Title (for data, not displayed in header)")).toHaveValue(mockInitialData.title);
    expect(screen.getByLabelText("Text to be Displayed")).toHaveValue(mockInitialData.text);
    expect(screen.getByLabelText("Background Color")).toHaveValue(mockInitialData.color);
    expect(screen.getByLabelText("Text Color")).toHaveValue(mockInitialData.textColor); // Exact match
    expect(screen.getByLabelText("Title Text Color")).toHaveValue(mockInitialData.titleTextColor);
    expect(screen.getByLabelText("Accent Color")).toHaveValue(mockInitialData.accentColor);
  });

  it('should call onChange with updated title (data field)', async () => {
    renderComponent();
    const titleInput = screen.getByLabelText("Title (for data, not displayed in header)");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Data Title');
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({ title: 'New Data Title' }));
  });

  it('should call onChange with updated text (message)', async () => {
    renderComponent();
    const textInput = screen.getByLabelText("Text to be Displayed");
    await userEvent.clear(textInput);
    await userEvent.type(textInput, 'New Message Content');
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({ text: 'New Message Content' }));
  });

  it('should call onChange with updated background color (color)', async () => {
    renderComponent();
    const backgroundColorInput = screen.getByLabelText("Background Color");
    fireEvent.change(backgroundColorInput, { target: { value: '#112233' } });
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ color: '#112233' }));
  });

  it('should call onChange with updated text color (textColor)', async () => {
    renderComponent();
    const textColorInput = screen.getByLabelText("Text Color");
    fireEvent.change(textColorInput, { target: { value: '#AABBCC' } });
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ textColor: '#AABBCC' }));
  });

  it('should call onChange with updated title text color (titleTextColor)', async () => {
    renderComponent();
    const titleTextColorInput = screen.getByLabelText("Title Text Color");
    fireEvent.change(titleTextColorInput, { target: { value: '#CCBBAA' } });
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ titleTextColor: '#CCBBAA' }));
  });

  it('should call onChange with updated accent color', async () => {
    renderComponent();
    const accentColorInput = screen.getByLabelText("Accent Color");
    fireEvent.change(accentColorInput, { target: { value: '#FF00FF' } });
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ accentColor: '#FF00FF' }));
  });
});
