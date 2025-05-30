import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library, config, IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faPlay,
  faFont,
  faList,
  faMousePointer,
  faCloudSun,
  faCalendar,
  faTimes,
  faCog,
} from '@fortawesome/free-solid-svg-icons';

config.autoAddCss = false; // Prevent Font Awesome from adding its own CSS automatically
library.add(faList, faPlay, faFont, faMousePointer, faCloudSun, faCalendar, faTimes, faCog);

import Widgets from '../../widgets';
import { IBaseWidget } from '../../widgets/base_widget';
import WidgetEditDialog, { IWidgetEditDialog } from './WidgetEditDialog'; // Assuming WidgetEditDialog is or will be typed

export interface IEditableWidgetProps {
  id: string; // Widget instance ID
  type: string; // Widget type key, used to look up in global Widgets object
  onDelete: () => void; // Callback when delete is clicked
  layout?: 'spaced' | 'compact'; // Layout style
  // Props from react-grid-layout are typically spread onto the component by RGL itself.
  // If we need to access them directly (e.g., for styling or logic), they should be defined here.
  // For example: style?: React.CSSProperties; className?: string; 'data-grid'?: any;
}

const EditableWidget: React.FC<IEditableWidgetProps> = ({ id, type = 'slideshow', onDelete, layout = 'spaced' }) => {
  // Using useRef hook instead of createRef
  const dialogRef = useRef<WidgetEditDialog>(null);

  const openDialog = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    dialogRef.current?.open();
  };

  const handleDeleteClick = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    onDelete(); // Call the onDelete prop passed from parent
  };

  // Retrieve widget definition from the global Widgets object
  const widgetDefinition: IBaseWidget | undefined = Widgets[type];

  const widgetName = widgetDefinition?.name || 'Broken Widget';
  const widgetIcon = widgetDefinition?.icon || faTimes; // Default icon if not found

  return (
    <div className={'widget-editable-container'}>
      <div className={'controls'}>
        <div className={'edit-btn'} onClick={openDialog} role="button" tabIndex={0}>
          <FontAwesomeIcon icon={faCog} size={'xs'} fixedWidth />
        </div>
        <div className={'delete-btn'} onClick={handleDeleteClick} role="button" tabIndex={0}>
          <FontAwesomeIcon icon={faTimes} size={'xs'} fixedWidth />
        </div>
      </div>
      <div className={'info'}>
        <div className={'icon-display'}>
          <FontAwesomeIcon icon={widgetIcon as IconProp} size={'2x'} /> {/* Cast to IconProp */}
        </div>
        <span className={'type-name'}>{widgetName}</span>
      </div>
      <WidgetEditDialog
        ref={dialogRef}
        OptionsComponent={widgetDefinition?.Options}
        widgetId={id} // Pass widgetId instead of id if that's what WidgetEditDialog expects
        widgetType={type} // Pass widgetType for context in dialog
      />
      <style jsx>
        {`
          .widget-editable-container {
            background-color: rgba(108, 108, 108, 1);
            border-radius: ${layout === 'spaced' ? '6px' : '0px'};
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            padding: 8px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center; /* Center content by default */
            cursor: move;
            overflow: hidden;
            position: relative; /* For absolute positioning of controls */
          }
          .widget-editable-container .info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center; /* Ensure text is centered */
          }
          .widget-editable-container .info .icon-display { /* Renamed for clarity */
            color: white;
            margin-bottom: 16px;
          }
          .widget-editable-container .info .type-name { /* Renamed for clarity */
            color: white;
            font-family: 'Open Sans', sans-serif;
            text-transform: uppercase;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%; /* Ensure it doesn't overflow its container */
          }
          /* .name class was unused in original JSX */
          .widget-editable-container .controls {
            position: absolute;
            font-family: 'Open Sans', sans-serif;
            top: 8px;
            right: 8px;
            display: none; /* Hidden by default, shown on hover */
            flex-direction: row; /* Make buttons appear in a row */
            z-index: 10; /* Ensure controls are above other content */
          }
          .widget-editable-container .delete-btn, /* Renamed for clarity */
          .widget-editable-container .edit-btn { /* Renamed for clarity */
            display: flex;
            width: 32px;
            height: 32px;
            justify-content: center;
            align-items: center;
            color: white;
            border-radius: 50%;
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
          }

          .widget-editable-container .edit-btn {
            background: rgba(0, 0, 0, 0.5);
            margin-right: 8px;
          }
          .widget-editable-container .edit-btn:hover {
            background: rgba(0, 0, 0, 0.7);
          }

          .widget-editable-container .delete-btn {
            background: rgba(200, 50, 50, 0.5); /* Adjusted color for visibility */
          }
          .widget-editable-container .delete-btn:hover {
            background: rgba(200, 50, 50, 0.7);
          }

          .widget-editable-container:hover .controls {
            display: flex; /* Show controls on hover */
          }
        `}
      </style>
    </div>
  );
};

export default EditableWidget;
