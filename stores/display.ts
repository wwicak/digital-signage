import { store, Store } from 'react-easy-state';
import _ from 'lodash';
import * as DisplayActions from '../actions/display'; // Assuming it will be .ts or allowJs handles .js
import shortid from 'shortid';

// Define interfaces for the state and related structures
interface IWidget {
  _id: string;
  name: string;
  type: string; // Consider creating an enum for WidgetType if it's well-defined
  x: number;
  y: number;
  w: number;
  h: number;
  data: any; // Replace 'any' with a more specific type if possible
}

interface IDisplayState {
  id: string | null;
  name: string | null;
  layout: 'spaced' | 'compact' | null;
  statusBar: string[] | null; // Assuming status bar items are strings like 'type_shortid'
  widgets: IWidget[] | null;
  setId: (id: string) => Promise<void>;
  setName: (name: string) => void;
  updateName: (name: string) => void;
  updateLayout: (layout: 'spaced' | 'compact') => void;
  addStatusBarItem: (type: string) => Promise<void>;
  removeStatusBarItem: (index: number) => void; // Changed id to index based on usage
  reorderStatusBarItems: (startIndex: number, endIndex: number) => void;
}

// Type for the displayInfo returned by DisplayActions.getDisplay
// This is an assumption; adjust if the actual structure is different.
interface IDisplayInfo {
  _id: string;
  name: string;
  layout: 'spaced' | 'compact';
  statusBar: string[];
  widgets: IWidget[];
  // Add other properties if present in displayInfo
}

const updateDisplayThrottled = _.debounce((id: string, data: Partial<IDisplayInfo>) => {
  // Assuming DisplayActions.updateDisplay can take a string ID.
  // If DisplayActions.updateDisplay expects an ObjectId, this might need adjustment.
  return DisplayActions.updateDisplay(id, data);
}, 300);

const display: Store<IDisplayState> = store({
  id: null,
  name: null,
  layout: null,
  statusBar: null,
  widgets: null,
  async setId(id: string): Promise<void> {
    if (!id) return;
    this.id = id;
    // Assuming getDisplay returns a Promise<IDisplayInfo>
    const displayInfo: IDisplayInfo = await DisplayActions.getDisplay(id);
    this.layout = displayInfo.layout;
    this.statusBar = displayInfo.statusBar;
    this.name = displayInfo.name;
    this.widgets = displayInfo.widgets;
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
  updateLayout(layout: 'spaced' | 'compact'): void {
    if (!layout || !['spaced', 'compact'].includes(layout) || !this.id) return;
    this.layout = layout;
    updateDisplayThrottled(this.id, { layout });
  },
  addStatusBarItem(type: string): Promise<void> {
    if (!this.id || !this.statusBar) { // Ensure statusBar is initialized
        // Optionally initialize statusBar if null, or handle error
        if (!this.statusBar) this.statusBar = [];
    }
    this.statusBar = [...this.statusBar!, type + '_' + shortid.generate()];
    updateDisplayThrottled(this.id!, { statusBar: this.statusBar });
    return Promise.resolve();
  },
  removeStatusBarItem(index: number): void {
    if (!this.id || !this.statusBar || index < 0 || index >= this.statusBar.length) return;
    this.statusBar = [...this.statusBar.slice(0, index), ...this.statusBar.slice(index + 1)];
    updateDisplayThrottled(this.id, { statusBar: this.statusBar });
  },
  reorderStatusBarItems(startIndex: number, endIndex: number): void {
    if (!this.id || !this.statusBar || !this.statusBar) return;
    const result = Array.from(this.statusBar);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    this.statusBar = result;
    updateDisplayThrottled(this.id, { statusBar: this.statusBar });
  }
});

export default display;
