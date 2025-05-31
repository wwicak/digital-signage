import imageWidget from '../../../widgets/image'; // Default import
import ImageContent from '../../../widgets/image/src/ImageContent';
import ImageOptions from '../../../widgets/image/src/ImageOptions';
import { WidgetType } from '../../../api/models/Widget'; // For comparing type
import { faImage } from "@fortawesome/free-solid-svg-icons";

describe('Image Widget - Index', () => {
  it('should have correct properties', () => {
    expect(imageWidget.name).toBe('Image');
    // Assuming WidgetType.IMAGE is "image"
    expect(imageWidget.type).toBe(WidgetType.IMAGE);
    expect(imageWidget.version).toBe('0.1');
    expect(imageWidget.icon).toEqual(faImage);
  });

  it('should have correct defaultData', () => {
    expect(imageWidget.defaultData).toEqual({
      title: null,
      url: null,
      fit: "contain",
      color: "#2d3436",
      altText: "",
    });
  });

  it('should reference the correct Widget component', () => {
    expect(imageWidget.Widget).toBe(ImageContent);
  });

  it('should reference the correct Options component', () => {
    expect(imageWidget.Options).toBe(ImageOptions);
  });
});
