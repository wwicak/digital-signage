import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageContent from '../../../widgets/image/src/ImageContent';
import { IImageWidgetData, TImageFit } from '../../../widgets/image/index'; // Get types from widget index

// Default data structure from widget's index.ts to use as a base for tests
const baseDefaultData: IImageWidgetData = {
  title: null,
  url: null,
  fit: 'contain',
  color: '#2d3436',
  altText: '',
};

describe('ImageContent Component', () => {
  it('should render placeholder when URL is null (default data)', () => {
    render(<ImageContent data={baseDefaultData} isPreview={false} />);
    expect(screen.getByTestId('image-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText('No Image URL Provided')).toBeInTheDocument();
    expect(screen.queryByTestId('image-widget-main-image')).not.toBeInTheDocument();
    expect(screen.queryByTestId('image-widget-photocover')).not.toBeInTheDocument();
  });

  it('should render placeholder when data prop is undefined', () => {
    render(<ImageContent data={undefined} isPreview={false} />);
    expect(screen.getByTestId('image-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText('No Image URL Provided')).toBeInTheDocument();
  });

  it('should render image and photocover when URL is provided', () => {
    const dataWithUrl: IImageWidgetData = {
      ...baseDefaultData,
      url: 'http://example.com/test.png',
      altText: 'Test image alt text',
    };
    render(<ImageContent data={dataWithUrl} isPreview={false} />);

    expect(screen.queryByTestId('image-widget-placeholder')).not.toBeInTheDocument();
    const mainImage = screen.getByTestId('image-widget-main-image');
    const photoCover = screen.getByTestId('image-widget-photocover');

    expect(mainImage).toBeInTheDocument();
    expect(photoCover).toBeInTheDocument();
    expect(mainImage).toHaveStyle(`background-image: url(${dataWithUrl.url})`);
    expect(photoCover).toHaveStyle(`background-image: url(${dataWithUrl.url})`);

    const container = screen.getByTestId('image-widget-container');
    expect(container).toHaveAttribute('aria-label', 'Test image alt text');
  });

  it('should display title when provided', () => {
    const dataWithTitle: IImageWidgetData = {
      ...baseDefaultData,
      url: 'http://example.com/test.png',
      title: 'My Test Image Title',
    };
    render(<ImageContent data={dataWithTitle} isPreview={false} />);
    expect(screen.getByTestId('image-widget-title')).toBeInTheDocument();
    expect(screen.getByTestId('image-widget-title')).toHaveTextContent('My Test Image Title');
  });

  it('should not display title container when title is null or empty', () => {
    render(<ImageContent data={{ ...baseDefaultData, url: 'http://example.com/test.png', title: null }} isPreview={false} />);
    expect(screen.queryByTestId('image-widget-title')).not.toBeInTheDocument();

    render(<ImageContent data={{ ...baseDefaultData, url: 'http://example.com/test.png', title: '' }} isPreview={false} />);
    // Corrected: An empty string for title is falsy, so the title element should not render.
    expect(screen.queryByTestId('image-widget-title')).not.toBeInTheDocument();
  });

  it('should apply styles from data prop', () => {
    const customStyleData: IImageWidgetData = {
      url: 'http://example.com/styled.png',
      fit: 'cover',
      color: 'rgb(0, 0, 255)', // blue
      altText: 'Styled image',
    };
    render(<ImageContent data={customStyleData} isPreview={false} />);

    const container = screen.getByTestId('image-widget-container');
    expect(container).toHaveStyle(`background: rgb(0, 0, 255)`);

    const mainImage = screen.getByTestId('image-widget-main-image');
    expect(mainImage).toHaveStyle(`background-size: cover`);
  });

  const fitOptions: TImageFit[] = ['contain', 'cover', 'fill', 'none', 'scale-down'];
  fitOptions.forEach(fitType => {
    it(`should apply correct background-size for fit: ${fitType}`, () => {
      const data: IImageWidgetData = { ...baseDefaultData, url: 'http://example.com/test.jpg', fit: fitType };
      render(<ImageContent data={data} />);
      expect(screen.getByTestId('image-widget-main-image')).toHaveStyle(`background-size: ${fitType}`);
    });
  });

  it('should use default alt text if none provided but url exists', () => {
    const dataWithUrl: IImageWidgetData = {
      ...baseDefaultData,
      url: 'http://example.com/test.png',
      altText: undefined, // Explicitly undefined, component will use its DEFAULT_ALT_TEXT
    };
    render(<ImageContent data={dataWithUrl} isPreview={false} />);
    const container = screen.getByTestId('image-widget-container');
    expect(container).toHaveAttribute('aria-label', 'Displayed image'); // Component's DEFAULT_ALT_TEXT
  });

  it('should use title as fallback aria-label if altText is empty string', () => {
    const dataWithTitleNoAlt: IImageWidgetData = {
      ...baseDefaultData,
      url: 'http://example.com/test.png',
      title: 'Image Title Fallback',
      altText: "", // Explicitly empty string to test title fallback
    };
    render(<ImageContent data={dataWithTitleNoAlt} isPreview={false} />);
    const container = screen.getByTestId('image-widget-container');
    expect(container).toHaveAttribute('aria-label', 'Image Title Fallback');
  });

  it('should use default "Image widget" aria-label if title and altText are empty strings', () => {
    const dataWithUrlNoTitleNoAlt: IImageWidgetData = {
      ...baseDefaultData,
      url: 'http://example.com/test.png',
      title: "", // Explicitly empty
      altText: "", // Explicitly empty
    };
    render(<ImageContent data={dataWithUrlNoTitleNoAlt} isPreview={false} />);
    const container = screen.getByTestId('image-widget-container');
    expect(container).toHaveAttribute('aria-label', 'Image widget'); // The final fallback in component logic
  });
});
