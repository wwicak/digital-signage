import React, { Component } from 'react'
import { Draggable, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd'

import { StatusBarElementTypes, IStatusBarElementDefinition } from '../../helpers/statusbar' // Assuming statusbar.js will be typed

export interface IStatusBarElementProps {
  item: string; // Unique ID for the draggable item, e.g., "type_uniqueId"
  index: number; // Index of the item in the list, required by Draggable
  onDelete: () => void; // Callback when delete is clicked
}

/*
 * No local state for this component
 * interface IStatusBarElementState {}
 */

class StatusBarElement extends Component<IStatusBarElementProps> {
  constructor(props: IStatusBarElementProps) {
    super(props)
  }

  handleDeleteClick = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation() // Prevent any parent Draggable event interference
    this.props.onDelete()
  }

  render() {
    const { item, index } = this.props
    /*
     * The 'item' prop is expected to be a string like "clock_uuid" or just "clock" if unique by type.
     * If it contains an underscore, we parse the type. Otherwise, the item itself is the type.
     */
    const itemTypeKey = item.includes('_') ? item.split('_')[0] : item
    
    const elementType: IStatusBarElementDefinition | undefined = StatusBarElementTypes[itemTypeKey as keyof typeof StatusBarElementTypes]
    const iconToDisplay:  = (elementType?.icon ) || faTimes // Fallback icon
    const typeName: string = elementType?.name || itemTypeKey || 'Unknown'

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
              <div className={'delete-btn'} onClick={this.handleDeleteClick} role='button' tabIndex={0} onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') this.handleDeleteClick()}} aria-label='Delete item'> {/* Renamed class */}
                <<X className={'xs' />
              </div>
            </div>
            <div className={'info-content' className="w-4 h-4" />> {/* Renamed class */}
              <div className={'icon-display'}> {/* Renamed class */}
                <<iconToDisplay className={'sm' className="w-4 h-4" /> />
              </div>
              <span className={'type-name'}>{typeName}</span> {/* Renamed class */}
            </div>
            
          </div>
        )}
      </Draggable>
    )
  }
}

export default StatusBarElement