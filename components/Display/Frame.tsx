import React, { ReactNode, JSX } from "react";
import { Wifi } from "lucide-react";
import Clock from "react-live-clock";

/*
 * Define the structure for status bar items if they become more complex.
 * For now, it's an array of strings like "type_id" or just "type".
 * Example: 'date', 'time_1', 'connection_main'
 */
import * as z from "zod";

export const DisplayFramePropsSchema = z.object({
  children: z.custom<ReactNode>((val) => {
    // Basic placeholder validation for ReactNode
    return true;
  }),
  statusBar: z.array(z.string()).optional(),
  orientation: z.enum(["landscape", "portrait"]).nullable().optional(),
});

export type IDisplayFrameProps = z.infer<typeof DisplayFramePropsSchema>;

/*
 * No local state for this component
 * interface IDisplayFrameState {}
 */

const Frame: React.FC<IDisplayFrameProps> = React.memo(
  ({ children, statusBar = [], orientation = null }) => {
    const renderStatusBarItem = React.useCallback(
      (itemKey: string, index: number): JSX.Element | null => {
        // Assuming itemKey could be "type_uniqueId" or just "type"
        const type = itemKey.includes("_") ? itemKey.split("_")[0] : itemKey;

        switch (type) {
          case "date":
            return (
              <Clock
                key={`${type}-${index}`}
                ticking={true}
                format={"dddd, MMMM Do."}
              />
            );
          case "connection":
            return (
              <Wifi key={`${type}-${index}`} className='w-4 h-4 text-white' />
            );
          case "time":
            return (
              <Clock key={`${type}-${index}`} ticking={true} format={"H:mm"} />
            );
          default:
            /*
             * Return a spacer or null for unknown types to maintain flex layout integrity if needed
             * Or log a warning for unrecognized types.
             */
            console.warn(`Unknown status bar item type: ${type}`);
            return <span key={`${type}-${index}`}>&nbsp;</span>; // Render a space to maintain structure
        }
      },
      [],
    );

    const isPortrait = orientation === "portrait";
    const orientationClass = isPortrait ? "portrait-frame" : "landscape-frame";

    return (
      <div className={`display-frame ${orientationClass}`}>
        {statusBar && statusBar.length > 0 && (
          <div className={"status-bar-container"}>
            {statusBar.map((item, index) => (
              // Each item in the status bar should have its own container for styling (e.g., margins)
              <div
                key={`statusbar-item-${item}-${index}`}
                className={`status-bar-item item-${item.split("_")[0]}`}
              >
                {renderStatusBarItem(item, index)}
              </div>
            ))}
          </div>
        )}
        <div className='flex-1 flex flex-col overflow-hidden'>{children}</div>
      </div>
    );
  },
);

Frame.displayName = "Frame";

export default Frame;
