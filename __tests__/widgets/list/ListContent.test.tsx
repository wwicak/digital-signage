import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListContent from '../../../widgets/list/src/ListContent';
import { IListWidgetData, IListItem } from '../../../widgets/list/index';

const baseDefaultData: IListWidgetData = {
  title: null,
  color: '#34495e',
  textColor: '#ffffff',
  list: [{ text: "First item", label: null }],
  ordered: false,
  fontSize: 16,
};

describe('ListContent Component', () => {
  it('should render with default data if no data prop is provided', () => {
    // Component defaults: title=null, list=[], ordered=false, fontSize=16, color, textColor
    render(<ListContent isPreview={false} />);

    expect(screen.queryByTestId('list-widget-title')).not.toBeInTheDocument();
    const listElement = screen.getByTestId('list-widget-list');
    expect(listElement.tagName).toBe('UL'); // Default is unordered
    expect(within(listElement).queryAllByRole('listitem').length).toBe(0); // Default list is empty in component
  });

  it('should render a title when provided', () => {
    const dataWithTitle: IListWidgetData = { ...baseDefaultData, title: 'My Test List' };
    render(<ListContent data={dataWithTitle} isPreview={false} />);
    expect(screen.getByTestId('list-widget-title')).toBeInTheDocument();
    expect(screen.getByTestId('list-widget-title')).toHaveTextContent('My Test List');
  });

  it('should render an ordered list if data.ordered is true', () => {
    const data: IListWidgetData = { ...baseDefaultData, ordered: true };
    render(<ListContent data={data} />);
    const listElement = screen.getByTestId('list-widget-list');
    expect(listElement.tagName).toBe('OL');
  });

  it('should render an unordered list if data.ordered is false', () => {
    render(<ListContent data={{ ...baseDefaultData, ordered: false, list: [{text: "item"}] }} />);
    expect(screen.getByTestId('list-widget-list').tagName).toBe('UL');
  });

  it('should render an unordered list if data.ordered is undefined', () => {
    render(<ListContent data={{ ...baseDefaultData, ordered: undefined, list: [{text: "item"}] }} />);
    expect(screen.getByTestId('list-widget-list').tagName).toBe('UL');
  });

  it('should render list items with text and optional labels', () => {
    const items: IListItem[] = [
      { text: 'Item 1 Text' },
      { text: 'Item 2 Text', label: 'Label 2' },
      { text: 'Item 3 Text' },
    ];
    const data: IListWidgetData = { ...baseDefaultData, list: items };
    render(<ListContent data={data} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBe(3);

    expect(within(listItems[0]).getByTestId('list-item-text')).toHaveTextContent('Item 1 Text');
    expect(within(listItems[0]).queryByTestId('list-item-label')).not.toBeInTheDocument();

    expect(within(listItems[1]).getByTestId('list-item-text')).toHaveTextContent('Item 2 Text');
    expect(within(listItems[1]).getByTestId('list-item-label')).toBeInTheDocument();
    expect(within(listItems[1]).getByTestId('list-item-label')).toHaveTextContent('Label 2');
  });

  it('should render default text for items with empty text', () => {
    const items: IListItem[] = [{ text: '' }];
    const data: IListWidgetData = { ...baseDefaultData, list: items };
    render(<ListContent data={data} />);
    expect(screen.getByTestId('list-item-text')).toHaveTextContent('Insert some text ...');
  });

  it('should apply custom styles from data prop', () => {
    const customStyleData: IListWidgetData = {
      ...baseDefaultData,
      list: [{text: "Styled Item"}],
      color: 'rgb(0, 0, 255)',      // blue background
      textColor: 'rgb(255, 255, 0)',// yellow text
      fontSize: 24,
    };
    render(<ListContent data={customStyleData} isPreview={false} />);

    const container = screen.getByTestId('list-widget-container');
    expect(container).toHaveStyle(`background: rgb(0, 0, 255)`);
    expect(container).toHaveStyle(`color: rgb(255, 255, 0)`);

    const listItem = screen.getByTestId('list-item-0');
    expect(listItem).toHaveStyle(`font-size: 24px`);
  });

  it('should render an empty list correctly', () => {
    render(<ListContent data={{...baseDefaultData, list: [] }} isPreview={false} />);
    const listElement = screen.getByTestId('list-widget-list');
    expect(within(listElement).queryAllByRole('listitem').length).toBe(0);
  });

  it('isPreview prop should not affect rendering logic significantly for this component', () => {
    // Test that isPreview true/false renders same essential structure
    const items: IListItem[] = [{ text: 'Preview Item' }];
    const data: IListWidgetData = { ...baseDefaultData, list: items };

    const { rerender } = render(<ListContent data={data} isPreview={false} />);
    expect(screen.getByTestId('list-item-text')).toHaveTextContent('Preview Item');

    rerender(<ListContent data={data} isPreview={true} />);
    expect(screen.getByTestId('list-item-text')).toHaveTextContent('Preview Item');
  });
});
