import listWidget from '../../../widgets/list';
import ListContent from '../../../widgets/list/src/ListContent';
import ListOptions from '../../../widgets/list/src/ListOptions';
import { WidgetType } from '../../../api/models/Widget';
import { faListUl } from "@fortawesome/free-solid-svg-icons";

describe('List Widget Definition', () => {
  it('should have correct properties', () => {
    expect(listWidget.name).toBe('List');
    expect(listWidget.type).toBe(WidgetType.LIST);
    expect(listWidget.version).toBe('0.1');
    expect(listWidget.icon).toEqual(faListUl);
  });

  it('should have correct defaultData from widget definition', () => {
    const defaultData = listWidget.defaultData;
    // These values should match exactly with widgets/list/index.ts
    expect(defaultData.title).toBeNull(); // Changed from 'My List' to null
    expect(defaultData.color).toBe('#34495e');
    expect(defaultData.textColor).toBe('#ffffff');
    expect(defaultData.fontSize).toBe(16);
    expect(defaultData.ordered).toBe(false);
    expect(defaultData.list).toEqual([ // Changed list structure
      { text: 'First item', label: null },
    ]);
  });

  it('should provide ListContent as the Widget component', () => {
    expect(listWidget.Widget).toBe(ListContent);
  });

  it('should provide ListOptions as the Options component', () => {
    expect(listWidget.Options).toBe(ListOptions);
  });

  it('should have defaultData structure compatible with IListWidgetData', () => {
    const defaultData = listWidget.defaultData;

    expect(defaultData).toHaveProperty('title');
    if (defaultData.title !== null) {
        expect(typeof defaultData.title).toBe('string');
    }

    expect(defaultData).toHaveProperty('color');
    expect(typeof defaultData.color).toBe('string');

    expect(defaultData).toHaveProperty('textColor');
    expect(typeof defaultData.textColor).toBe('string');

    expect(defaultData).toHaveProperty('list');
    expect(Array.isArray(defaultData.list)).toBe(true);

    expect(defaultData).toHaveProperty('ordered');
    expect(typeof defaultData.ordered).toBe('boolean');

    expect(defaultData).toHaveProperty('fontSize');
    expect(typeof defaultData.fontSize).toBe('number');

    if (defaultData.list && defaultData.list.length > 0) {
      defaultData.list.forEach(item => {
        expect(item).toHaveProperty('text');
        expect(typeof item.text).toBe('string');
        if (item.hasOwnProperty('label')) {
            if (item.label !== null) {
                 expect(typeof item.label).toBe('string');
            }
        }
      });
    }
  });
});
