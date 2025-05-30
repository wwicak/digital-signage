import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library, config, IconProp } from '@fortawesome/fontawesome-svg-core';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Draggable, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';

import { StatusBarElementTypes, IStatusBarElementDefinition } from '../../helpers/statusbar'; // Assuming statusbar.js will be typed

config.autoAddCss = false;
library.add(faTimes);

export interface IStatusBarElementProps {
  item: string; // Unique ID for the draggable item, e.g., "type_uniqueId"
  index: number; // Index of the item in the list, required by Draggable
  onDelete: () => void; // Callback when delete is clicked
}

// No local state for this component
// interface IStatusBarElementState {}

class StatusBarElement extends Component<IStatusBarElementProps> {
  constructor(props: IStatusBarElementProps) {
    super(props);
  }

  handleDeleteClick = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation(); // Prevent any parent Draggable event interference
    this.props.onDelete();
  };

  render() {
    const { item, index } = this.props;
    // The 'item' prop is expected to be a string like "clock_uuid" or just "clock" if unique by type.
    // If it contains an underscore, we parse the type. Otherwise, the item itself is the type.
    const itemTypeKey = item.includes('_') ? item.split('_')[0] : item;
    
    const elementType: IStatusBarElementDefinition | undefined = StatusBarElementTypes[itemTypeKey as keyof typeof StatusBarElementTypes];
    const iconToDisplay: IconProp = (elementType?.icon as IconProp) || faTimes; // Fallback icon
    const typeName: string = elementType?.name || itemTypeKey || 'Unknown';

    return (
      <Draggable key={item} draggableId={item} index={index}>
        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`status-bar-el ${snapshot.isDragging ? 'is-dragging' : ''}`}
            style={{
              ...provided.draggableProps.style,
              // Add any custom dragging styles based on snapshot.isDragging if needed
            }}
          >
            <div className={'controls-overlay'}> {/* Renamed class */}
              <div className={'delete-btn'} onClick={this.handleDeleteClick} role="button" tabIndex={0} onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') this.handleDeleteClick()}} aria-label="Delete item"> {/* Renamed class */}
                <FontAwesomeIcon icon={faTimes} size={'xs'} fixedWidth />
              </div>
            </div>
            <div className={'info-content'}> {/* Renamed class */}
              <div className={'icon-display'}> {/* Renamed class */}
                <FontAwesomeIcon icon={iconToDisplay} size={'sm'} />
              </div>
              <span className={'type-name'}>{typeName}</span> {/* Renamed class */}
            </div>
            <style jsx>
              {`
                .status-bar-el {
                  background-color: rgba(108, 108, 108, 0.9); /* Slightly more opaque */
                  border-radius: 6px;
                  /* height: 100%; */ /* Height should be determined by content or parent flex */
                  min-height: 48px; /* Minimum height */
                  width: auto; /* Allow shrinking or growing based on content */
                  min-width: 100px; /* Minimum width for content visibility */
                  box-sizing: border-box;
                  padding: 8px;
                  margin-left: 4px;
                  margin-right: 4px;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center; /* Center content */
                  cursor: grab; /* Changed from 'move' for DND */
                  overflow: hidden;
                  position: relative;
                  color: white; /* Default text color */
                  transition: background-color 0.2s ease;
                }
                .status-bar-el.is-dragging {
                  background-color: rgba(80, 80, 80, 0.95);
                  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                .status-bar-el .info-content { /* Renamed */
                  display: flex;
                  flex-direction: row; /* Align icon and text horizontally */
                  justify-content: center;
                  align-items: center;
                }
                .status-bar-el .info-content .icon-display { /* Renamed */
                  margin-right: 8px; /* Reduced margin */
                }
                .status-bar-el .info-content .type-name { /* Renamed */
                  font-family: 'Open Sans', sans-serif;
                  text-transform: uppercase;
                  font-size: 12px; /* Slightly smaller */
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  /* max-width: 100%; */ /* Let flexbox handle width */
                }
                .status-bar-el .controls-overlay { /* Renamed */
                  position: absolute;
                  font-family: 'Open Sans', sans-serif;
                  height: 100%;
                  width: 100%; /* Cover entire element for hover detection */
                  justify-content: flex-end; /* Align delete button to the right */
                  align-items: center; /* Vertically center delete button */
                  display: none; /* Hidden by default */
                  top: 0px;
                  left: 0px; /* Start from left to cover full width */
                  background-color: rgba(0,0,0,0.2); /* Slight overlay on hover */
                  border-radius: 6px; /* Match parent */
                  padding-right: 4px; /* Space for delete button */
                  box-sizing: border-box;
                }
                .status-bar-el .delete-btn { /* Renamed */
                  display: flex; /* Already flex, kept for explicitness */
                  /* font-family: 'Open Sans', sans-serif; */ /* Inherited */
                  width: 24px; /* Smaller delete button */
                  height: 24px;
                  justify-content: center;
                  align-items: center;
                  color: white;
                  border-radius: 50%;
                  cursor: pointer;
                  /* margin-right: 8px; */ /* Positioned by flex-end on parent */
                  background: rgba(200, 50, 50, 0.6); /* Adjusted color */
                  transition: background-color 0.2s ease;
                }
                .status-bar-el .delete-btn:hover {
                  background: rgba(200, 50, 50, 0.8);
                }

                .status-bar-el:hover .controls-overlay { /* Renamed */
                  display: flex; /* Show controls on hover */
                }
              `}
            </style>
          </div>
        )}
      </Draggable>
    );
  }
}

export default StatusBarElement;
