import React, { ReactNode, JSX } from 'react'
import Clock from 'react-live-clock' // react-live-clock might need @types/react-live-clock if not inherently typed
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWifi } from '@fortawesome/free-solid-svg-icons'
import { IconProp } from '@fortawesome/fontawesome-svg-core'

/*
 * Define the structure for status bar items if they become more complex.
 * For now, it's an array of strings like "type_id" or just "type".
 * Example: 'date', 'time_1', 'connection_main'
 */
import * as z from 'zod'

export const DisplayFramePropsSchema = z.object({
  children: z.custom<ReactNode>((val) => {
    // Basic placeholder validation for ReactNode
    return true
  }),
  statusBar: z.array(z.string()).optional(),
  orientation: z.enum(['landscape', 'portrait']).nullable().optional(),
})

export type IDisplayFrameProps = z.infer<typeof DisplayFramePropsSchema>;

/*
 * No local state for this component
 * interface IDisplayFrameState {}
 */

const Frame: React.FC<IDisplayFrameProps> = React.memo(({ children, statusBar = [], orientation = null }) => {
  const renderStatusBarItem = React.useCallback((itemKey: string, index: number): JSX.Element | null => {
    // Assuming itemKey could be "type_uniqueId" or just "type"
    const type = itemKey.includes('_') ? itemKey.split('_')[0] : itemKey

    switch (type) {
      case 'date':
        return <Clock key={`${type}-${index}`} ticking={true} format={'dddd, MMMM Do.'} />
      case 'connection':
        return <FontAwesomeIcon key={`${type}-${index}`} className={'wifi-icon'} icon={faWifi as IconProp} />
      case 'time':
        return <Clock key={`${type}-${index}`} ticking={true} format={'H:mm'} />
      default:
        /*
         * Return a spacer or null for unknown types to maintain flex layout integrity if needed
         * Or log a warning for unrecognized types.
         */
        console.warn(`Unknown status bar item type: ${type}`)
        return <span key={`${type}-${index}`}>&nbsp;</span> // Render a space to maintain structure
    }
  }, [])

  const isPortrait = orientation === 'portrait'
  const orientationClass = isPortrait ? 'portrait-frame' : 'landscape-frame'

  return (
    <div className={`display-frame ${orientationClass}`}>
      {statusBar && statusBar.length > 0 && (
        <div className={'status-bar-container'}>
          {statusBar.map((item, index) => (
            // Each item in the status bar should have its own container for styling (e.g., margins)
            <div key={`statusbar-item-${item}-${index}`} className={`status-bar-item item-${item.split('_')[0]}`}>
              {renderStatusBarItem(item, index)}
            </div>
          ))}
        </div>
      )}
      <div className='display-content'>
          {children}
      </div>
      <style jsx>
        {`
          .display-frame {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: black;
            font-family: 'Open Sans', sans-serif;
            color: white;
            transition: all 0.3s ease-in-out;
          }
          
          /* Portrait orientation specific styles */
          .display-frame.portrait-frame {
            /* Apply any frame-level portrait adjustments here */
          }
          
          /* Landscape orientation specific styles (default) */
          .display-frame.landscape-frame {
            /* Apply any frame-level landscape adjustments here */
          }
          
          .display-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s ease-in-out;
          }
          
          .status-bar-container {
            padding: ${isPortrait ? '10px 20px' : '15px 30px'};
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
            background-color: rgba(0,0,0,0.2);
            min-height: ${isPortrait ? '40px' : '50px'};
            transition: all 0.3s ease-in-out;
          }
          
          .status-bar-item {
            display: flex;
            align-items: center;
          }
          
          .status-bar-item:not(:first-child) {
            margin-left: ${isPortrait ? '12px' : '16px'};
          }
          
          .status-bar-item.item-connection .wifi-icon {
            color: #baff23;
          }
          
          .status-bar-item.item-date,
          .status-bar-item.item-time {
            font-size: ${isPortrait ? '0.9em' : '1em'};
          }
        `}
      </style>
    </div>
  )
})

Frame.displayName = 'Frame'

export default Frame
