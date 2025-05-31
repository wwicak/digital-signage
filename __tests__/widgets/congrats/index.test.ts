import congratsWidget from '../../../widgets/congrats'; // Default import
import CongratsContent from '../../../widgets/congrats/src/CongratsContent';
import CongratsOptions from '../../../widgets/congrats/src/CongratsOptions';
import { WidgetType } from '../../../api/models/Widget'; // For comparing type
import { faGifts } from "@fortawesome/free-solid-svg-icons";

describe('Congrats Widget - Index', () => {
  it('should have correct properties', () => {
    expect(congratsWidget.name).toBe('Congratulations');
    // Assuming WidgetType.CONGRATS is "congrats"
    // If WidgetType enum doesn't have CONGRATS, direct string comparison is better
    // For now, assuming the enum is comprehensive as per previous patterns
    expect(congratsWidget.type).toBe(WidgetType.CONGRATS);
    expect(congratsWidget.version).toBe('0.1');
    expect(congratsWidget.icon).toEqual(faGifts);
  });

  it('should have correct defaultData', () => {
    expect(congratsWidget.defaultData).toEqual({
      animation: "confetti",
      text: "Congratulations!",
      color: "#34495e",
      textColor: "#ffffff",
      fontSize: 16,
      recipient: "",
    });
  });

  it('should reference the correct Widget component', () => {
    expect(congratsWidget.Widget).toBe(CongratsContent);
  });

  it('should reference the correct Options component', () => {
    expect(congratsWidget.Options).toBe(CongratsOptions);
  });
});
