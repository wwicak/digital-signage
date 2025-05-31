import announcementWidget from '../../../widgets/announcement'; // Correct: Default import
import AnnouncementContent from '../../../widgets/announcement/src/AnnouncementContent';
import AnnouncementOptions from '../../../widgets/announcement/src/AnnouncementOptions';
// Removed WidgetType import from base_widget as type is a string literal

describe('Announcement Widget - Index', () => {
  it('should have correct properties', () => {
    expect(announcementWidget.name).toBe('Announcement');
    expect(announcementWidget.type).toBe('announcement'); // Assert against string literal
    expect(announcementWidget.version).toBe('0.1'); // Corrected version
    expect(announcementWidget.icon).toBeDefined();
  });

  it('should have correct defaultData', () => {
    // Aligned with actual defaultData from widgets/announcement/index.ts
    expect(announcementWidget.defaultData).toEqual({
      text: "",
      color: "#708090",
      textColor: "#ffffff",
      titleColor: "#fff0f0",
      accentColor: "#EDC951",
      title: "Announcement",
    });
  });

  it('should reference the correct Widget component', () => {
    expect(announcementWidget.Widget).toBe(AnnouncementContent);
  });

  it('should reference the correct Options component', () => {
    expect(announcementWidget.Options).toBe(AnnouncementOptions);
  });
});
