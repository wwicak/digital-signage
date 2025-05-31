import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnnouncementContent, { IAnnouncementContentProps } from '../../../widgets/announcement/src/AnnouncementContent';

// Mock FontAwesomeIcon
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn((props) => <i data-testid="mock-fa-icon" data-icon={props.icon.iconName} style={props.style} color={props.color} />),
}));

// Mock AutoScroll
jest.mock('../../../components/AutoScroll', () => {
  const MockAutoScroll = ({ children, style }: { children: React.ReactNode, style: React.CSSProperties }) => (
    <div data-testid="mock-autoscroll" style={style}>{children}</div>
  );
  MockAutoScroll.displayName = 'MockAutoScroll';
  return { __esModule: true, default: MockAutoScroll };
});


const renderAnnouncementContent = (props?: Partial<IAnnouncementContentProps>) => {
  const defaultProps: IAnnouncementContentProps = {
    data: {
      text: 'Default text',
      color: '#111111',
      textColor: '#222222',
      titleTextColor: '#333333',
      accentColor: '#444444',
      title: 'Custom Data Title', // This title is for data, not the hardcoded "Announcement"
    },
    isPreview: false,
  };
  return render(<AnnouncementContent {...defaultProps} {...props} />);
};

describe('AnnouncementContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders hardcoded "Announcement" title and icon', () => {
    renderAnnouncementContent();
    expect(screen.getByText('Announcement')).toBeInTheDocument();
    const icon = screen.getByTestId('mock-fa-icon');
    expect(icon).toHaveAttribute('data-icon', 'exclamation-triangle');
  });

  test('renders provided text content, splitting newlines', () => {
    const textWithNewlines = "First line\nSecond line";
    renderAnnouncementContent({ data: { text: textWithNewlines } });
    expect(screen.getByText('First line')).toBeInTheDocument();
    expect(screen.getByText('Second line')).toBeInTheDocument();
  });

  test('renders <br /> for empty lines in text', () => {
    const textWithEmptyLine = "Content\n\nMore content";
    renderAnnouncementContent({ data: { text: textWithEmptyLine } });
    const content = screen.getByTestId('mock-autoscroll');
    // Check for the structure more flexibly
    expect(content.textContent?.trim()).toBe('ContentMore content'); // Visually, BRs don't add text content
    expect(content.querySelectorAll('.text-content > div').length).toBe(3); // Three divs for three lines
    expect(content.querySelector('.text-content > div:nth-child(2) > br')).toBeInTheDocument(); // BR in the second div
  });

  test('renders default text if data.text is undefined', () => {
    renderAnnouncementContent({ data: { ...defaultScreenValue.data, text: undefined } });
    const content = screen.getByTestId('mock-autoscroll');
    expect(content.querySelector('.text-content > div > br')).toBeInTheDocument();
    expect(content.querySelector('.text-content > div')?.textContent?.trim()).toBe('');
  });

  test('renders default text if data is undefined', () => {
    renderAnnouncementContent({ data: undefined });
    const content = screen.getByTestId('mock-autoscroll');
    expect(content.querySelector('.text-content > div > br')).toBeInTheDocument();
    expect(content.querySelector('.text-content > div')?.textContent?.trim()).toBe('');
  });
  test('applies custom colors from data prop', () => {
    const customData = {
      color: 'rgb(0, 0, 1)',       // blue
      textColor: 'rgb(0, 0, 2)',    // green
      titleTextColor: 'rgb(0, 0, 3)', // red
      accentColor: 'rgb(0, 0, 4)',  // yellow
    };
    renderAnnouncementContent({ data: customData });

    const widgetContent = screen.getByText('Announcement').closest('.announce-widget-content');
    expect(widgetContent).toHaveStyle(`background: ${customData.color}`);
    expect(widgetContent).toHaveStyle(`color: ${customData.textColor}`); // Main text color

    const titleBar = screen.getByText('Announcement').closest('.title-bar');
    expect(titleBar).toHaveStyle(`color: ${customData.titleTextColor}`);
    expect(titleBar).toHaveStyle(`border-left: 4px solid ${customData.accentColor}`);

    const icon = screen.getByTestId('mock-fa-icon');
    expect(icon).toHaveAttribute('color', customData.accentColor);
  });

  test('applies default colors if not provided in data', () => {
    renderAnnouncementContent({ data: {} }); // Empty data object

    const DEFAULT_COLOR = '#708090';
    const DEFAULT_TEXT_COLOR = '#ffffff';
    const DEFAULT_TITLE_TEXT_COLOR = '#fff0f0';
    const DEFAULT_ACCENT_COLOR = '#EDC951';

    const widgetContent = screen.getByText('Announcement').closest('.announce-widget-content');
    expect(widgetContent).toHaveStyle(`background: ${DEFAULT_COLOR}`);
    expect(widgetContent).toHaveStyle(`color: ${DEFAULT_TEXT_COLOR}`);

    const titleBar = screen.getByText('Announcement').closest('.title-bar');
    expect(titleBar).toHaveStyle(`color: ${DEFAULT_TITLE_TEXT_COLOR}`);
    expect(titleBar).toHaveStyle(`border-left: 4px solid ${DEFAULT_ACCENT_COLOR}`);

    const icon = screen.getByTestId('mock-fa-icon');
    expect(icon).toHaveAttribute('color', DEFAULT_ACCENT_COLOR);
  });

  test('AutoScroll component is rendered', () => {
    renderAnnouncementContent();
    expect(screen.getByTestId('mock-autoscroll')).toBeInTheDocument();
  });

  // Helper data for tests that need it
  const defaultScreenValue: IAnnouncementContentProps = {
    data: {
      text: 'Default text',
      color: '#111111',
      textColor: '#222222',
      titleTextColor: '#333333',
      accentColor: '#444444',
      title: 'Custom Data Title',
    },
    isPreview: false,
  };

});
