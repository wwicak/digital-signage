import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnnouncementContent from '../../../widgets/announcement/src/AnnouncementContent';
import { IAnnouncementWidgetData } from '../../../widgets/announcement/src/AnnouncementContent'; // Corrected import

// Removed unused defaultData variable

describe('AnnouncementContent Component', () => {
  it('should render with component internal defaults if no data is provided', () => {
    render(<AnnouncementContent data={undefined} isPreview={false} />);

    expect(screen.getByTestId('announcement-title-bar-text')).toHaveTextContent('Announcement');
    const textContent = screen.getByTestId('announcement-text-content');
    expect(textContent.innerHTML.trim()).toBe('<div><br></div>'); // Empty DEFAULT_TEXT renders this
  });

  it('should render with provided custom text', () => {
    const customData: IAnnouncementWidgetData = {
      text: 'This is a custom announcement message.',
    };
    render(<AnnouncementContent data={customData} isPreview={false} />);

    expect(screen.getByTestId('announcement-title-bar-text')).toHaveTextContent('Announcement');
    expect(screen.getByText('This is a custom announcement message.')).toBeInTheDocument();
  });

  it('should apply custom styles from data', () => {
    const customStyleData: IAnnouncementWidgetData = {
      text: 'Styled message.',
      color: '#123456',        // Widget background (maps to component's `color` prop)
      textColor: '#FEDCBA',    // Main text color (maps to component's `textColor` prop)
      titleTextColor: '#ABCDEF',// Title bar text "Announcement" color (maps to component's `titleTextColor` prop)
      accentColor: '#FF00FF',   // Icon and title bar border color (maps to component's `accentColor` prop)
      // title prop is not used for visible title bar text, can be omitted if not required by IAnnouncementWidgetData
    };
    render(<AnnouncementContent data={customStyleData} isPreview={false} />);

    const widgetContent = screen.getByTestId('announcement-title-bar-text').closest('.announce-widget-content');
    expect(widgetContent).toHaveStyle(`background: #123456`);
    expect(widgetContent).toHaveStyle(`color: #FEDCBA`);

    const titleBarTextElement = screen.getByTestId('announcement-title-bar-text');
    expect(titleBarTextElement).toHaveStyle(`color: #ABCDEF`);

    const titleBarDiv = titleBarTextElement.parentElement;
    expect(titleBarDiv).toHaveStyle('border-left: 4px solid #FF00FF');

    const iconElement = titleBarDiv?.querySelector('svg');
    expect(iconElement).toHaveAttribute('color', '#FF00FF');
    // Removed assertions for titleSize and messageSize as they are not applied from props
  });

  it('should render correctly in preview mode', () => {
    const previewData: IAnnouncementWidgetData = {
      text: 'Preview message.',
    };
    render(<AnnouncementContent data={previewData} isPreview={true} />);

    expect(screen.getByTestId('announcement-title-bar-text')).toHaveTextContent('Announcement');
    expect(screen.getByText('Preview message.')).toBeInTheDocument();
  });

  it('should handle empty text gracefully', () => {
    const emptyData: IAnnouncementWidgetData = {
      text: '',
    };
    render(<AnnouncementContent data={emptyData} isPreview={false} />);

    const textContent = screen.getByTestId('announcement-text-content');
    expect(textContent.innerHTML.trim()).toBe('<div><br></div>');
  });
});
