import { store } from "react-easy-state";
import _ from "lodash";
import * as DisplayActions from "../actions/display";
import { IDisplayData } from "../actions/display";
import shortid from "shortid";

// Import types from actions to ensure consistency
interface IWidget {
  _id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data: any;
}

interface IStatusBar {
  enabled?: boolean;
  color?: string;
  elements?: string[];
}

interface IDisplayState {
  id: string | null;
  name: string | null;
  layout: "spaced" | "compact" | null;
  statusBar: IStatusBar;
  widgets: IWidget[];
  setId: (id: string) => Promise<void>;
  setName: (name: string) => void;
  updateName: (name: string) => void;
  updateLayout: (layout: "spaced" | "compact") => void;
  addStatusBarItem: (type: string) => Promise<void>;
  removeStatusBarItem: (index: number) => void;
  reorderStatusBarItems: (startIndex: number, endIndex: number) => void;
}

const updateDisplayThrottled = _.debounce(
  (id: string, data: Partial<IDisplayData>) => {
    return DisplayActions.updateDisplay(id, data);
  },
  300
);

const display = store({
  id: null as string | null,
  name: null as string | null,
  layout: null as "spaced" | "compact" | null,
  statusBar: { enabled: false, elements: [] as string[] } as IStatusBar,
  widgets: [] as IWidget[],
  async setId(id: string): Promise<void> {
    if (!id) return;
    this.id = id;
    const displayInfo: IDisplayData = await DisplayActions.getDisplay(id);
    this.layout = displayInfo.layout || null;
    this.statusBar = displayInfo.statusBar || { enabled: false, elements: [] };
    this.name = displayInfo.name;
    this.widgets = displayInfo.widgets || [];
  },
  setName(name: string): void {
    if (!name) return;
    this.name = name;
  },
  updateName(name: string): void {
    if (!name || !this.id) return;
    this.name = name;
    updateDisplayThrottled(this.id, { name });
  },
  updateLayout(layout: "spaced" | "compact"): void {
    if (!layout || !["spaced", "compact"].includes(layout) || !this.id) return;
    this.layout = layout;
    updateDisplayThrottled(this.id, { layout });
  },
  addStatusBarItem(type: string): Promise<void> {
    if (!this.id) return Promise.resolve();

    const elements = this.statusBar.elements || [];
    this.statusBar = {
      ...this.statusBar,
      elements: [...elements, type + "_" + shortid.generate()],
    };
    updateDisplayThrottled(this.id, { statusBar: this.statusBar });
    return Promise.resolve();
  },
  removeStatusBarItem(index: number): void {
    const elements = this.statusBar.elements || [];
    if (!this.id || index < 0 || index >= elements.length) return;

    this.statusBar = {
      ...this.statusBar,
      elements: [...elements.slice(0, index), ...elements.slice(index + 1)],
    };
    updateDisplayThrottled(this.id, { statusBar: this.statusBar });
  },
  reorderStatusBarItems(startIndex: number, endIndex: number): void {
    const elements = this.statusBar.elements || [];
    if (!this.id || elements.length === 0) return;

    const result = Array.from(elements);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    this.statusBar = {
      ...this.statusBar,
      elements: result,
    };
    updateDisplayThrottled(this.id, { statusBar: this.statusBar });
  },
});

export { display };
export default display;
