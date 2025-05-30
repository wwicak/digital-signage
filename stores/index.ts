// Legacy stores have been migrated to TanStack Query and React Context
// This file provides a compatibility layer during migration

// Mock display store for backward compatibility
// Components should be updated to use DisplayContext instead
export const display = {
  id: null as string | null,
  name: null as string | null,
  layout: null as "spaced" | "compact" | null,
  statusBar: { enabled: false, elements: [] as string[] },
  widgets: [] as any[],

  setId: (id: string): Promise<void> => {
    throw new Error(
      "display.setId() has been migrated. Use DisplayContext.setId() instead."
    );
  },
  setName: (name: string): void => {
    throw new Error(
      "display.setName() has been migrated. Use DisplayContext.setName() instead."
    );
  },
  updateName: (name: string): void => {
    throw new Error(
      "display.updateName() has been migrated. Use DisplayContext.updateName() instead."
    );
  },
  updateLayout: (layout: "spaced" | "compact"): void => {
    throw new Error(
      "display.updateLayout() has been migrated. Use DisplayContext.updateLayout() instead."
    );
  },
  addStatusBarItem: (type: string): Promise<void> => {
    throw new Error(
      "display.addStatusBarItem() has been migrated. Use DisplayContext.addStatusBarItem() instead."
    );
  },
  removeStatusBarItem: (index: number): void => {
    throw new Error(
      "display.removeStatusBarItem() has been migrated. Use DisplayContext.removeStatusBarItem() instead."
    );
  },
  reorderStatusBarItems: (startIndex: number, endIndex: number): void => {
    throw new Error(
      "display.reorderStatusBarItems() has been migrated. Use DisplayContext.reorderStatusBarItems() instead."
    );
  },
};
