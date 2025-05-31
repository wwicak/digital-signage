import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ImageContent, { IImageContentProps, DEFAULT_COLOR, DEFAULT_FIT, DEFAULT_ALT_TEXT } from './ImageContent';

// No complex child components to mock for ImageContent itself.

describe('ImageContent', () => {
  const defaultProps: IImageContentProps = {
    data: {
      url: 'http://example.com/image.jpg',
      altText: 'Test Alt Text',
      fit: 'cover',
      color: '#FF0000',
      title: 'Test Title',
    },
  };

  const renderImageContent = (props: Partial<IImageContentProps> = {}) => {
    return render(<ImageContent {...defaultProps} {...props} />);
  };

  test('renders title when provided', () => {
    renderImageContent();
    expect(screen.getByText(defaultProps.data!.title!)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.data!.title!).closest('.title-container')).toBeInTheDocument();
  });

  test('does not render title container if title is not provided', () => {
    const { container } = renderImageContent({ data: { ...defaultProps.data, title: null } });
    // title is null, so defaultProps.data.title (which is 'Test Title') should not be found.
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    expect(container.querySelector('.title-container')).not.toBeInTheDocument();
  });

  test('renders image with correct url, fit, and color when url is provided', () => {
    renderImageContent();
    const contentArea = screen.getByLabelText(defaultProps.data!.altText!).querySelector('.content-area');
    expect(contentArea).toBeInTheDocument();

    const photoCover = contentArea!.querySelector('.photocover-bg');
    const photoMain = contentArea!.querySelector('.photo-main');

    expect(photoCover).toHaveStyle(`background-image: url(${defaultProps.data!.url})`);
    expect(photoMain).toHaveStyle(`background-image: url(${defaultProps.data!.url})`);
    expect(photoMain).toHaveStyle(`background-size: ${defaultProps.data!.fit}`);

    // Check background color of the content area or main widget container
    // The component applies color to .image-widget-content and .content-area style prop
    expect(contentArea).toHaveStyle(`background: ${defaultProps.data!.color}`);
    // also check main container if needed, though content-area might be more specific
    // expect(screen.getByLabelText(defaultProps.data!.altText!)).toHaveStyle(`background: ${defaultProps.data!.color}`);

  });

  test('applies aria-label from altText', () => {
    renderImageContent();
    expect(screen.getByLabelText(defaultProps.data!.altText!)).toBeInTheDocument();
  });

  test('applies DEFAULT_ALT_TEXT for aria-label if data.altText is undefined, even if title is present', () => {
    // Component's logic: altText = data.altText ?? DEFAULT_ALT_TEXT;
    // aria-label = altText (which is now DEFAULT_ALT_TEXT) || title || "Image widget"
    const propsWithoutAlt = { data: { ...defaultProps.data, altText: undefined } };
    renderImageContent(propsWithoutAlt);
    // Expecting 'Displayed image' (value of DEFAULT_ALT_TEXT)
    expect(screen.getByLabelText('Displayed image')).toBeInTheDocument();
  });

  test('applies DEFAULT_ALT_TEXT for aria-label if title and data.altText are missing', () => {
    // Component's logic: altText = data.altText ?? DEFAULT_ALT_TEXT;
    // aria-label = altText (now DEFAULT_ALT_TEXT) || title (undefined) || "Image widget"
    const propsWithoutTitleAlt = { data: { ...defaultProps.data, title: undefined, altText: undefined } };
    renderImageContent(propsWithoutTitleAlt);
    // Expecting 'Displayed image' (value of DEFAULT_ALT_TEXT)
    expect(screen.getByLabelText('Displayed image')).toBeInTheDocument();
  });


  test('renders placeholder when url is not provided', () => {
    renderImageContent({ data: { ...defaultProps.data, url: null } });
    expect(screen.getByText('No Image URL Provided')).toBeInTheDocument();

    const contentArea = screen.getByText('No Image URL Provided').closest('.content-area');
    expect(contentArea).toHaveClass('placeholder-content');

    const photoCover = contentArea!.querySelector('.photocover-bg');
    const photoMain = contentArea!.querySelector('.photo-main');
    // These elements might not exist or should not have background-image
    expect(photoCover).toBeNull(); // Or check style if it exists
    expect(photoMain).toBeNull(); // Or check style if it exists
  });

  test('renders placeholder when url is an empty string', () => {
    renderImageContent({ data: { ...defaultProps.data, url: '' } });
    expect(screen.getByText('No Image URL Provided')).toBeInTheDocument();
  });

  test('uses default fit, color, and altText if not provided in data', () => {
    // Note: defaultProps already provides these, so we need to render with data explicitly undefined for some
    // or an empty data object to test component's internal defaults.
    // Using the actual string value of DEFAULT_ALT_TEXT to avoid import issues if any.
    render(<ImageContent data={{ url: 'http://example.com/image.jpg' }} />); // Only URL is provided

    const mainWidget = screen.getByLabelText('Displayed image');
    expect(mainWidget).toBeInTheDocument();

    const contentArea = mainWidget.querySelector('.content-area');
    expect(contentArea).toBeInTheDocument();
    // Using actual hex value for DEFAULT_COLOR to avoid import issues. DEFAULT_COLOR is '#2d3436'
    expect(contentArea).toHaveStyle(`background: #2d3436`);

    const photoMain = contentArea!.querySelector('.photo-main');
    expect(photoMain).toHaveStyle(`background-image: url(http://example.com/image.jpg)`);
    // Using actual string value for DEFAULT_FIT ('contain')
    expect(photoMain).toHaveStyle(`background-size: contain`);
  });

  test('applies different fit values correctly', () => {
    const fitValue: IImageContentProps['data']['fit'] = 'scale-down';
    renderImageContent({ data: { ...defaultProps.data, fit: fitValue } });
    const photoMain = screen.getByLabelText(defaultProps.data!.altText!).querySelector('.photo-main');
    expect(photoMain).toHaveStyle(`background-size: ${fitValue}`);
  });

});
