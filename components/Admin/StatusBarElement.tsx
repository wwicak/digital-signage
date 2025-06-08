import React, { Component } from 'react'
import { Draggable, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd'
import { X } from 'lucide-react'

import { StatusBarElementTypes, IStatusBarElementDefinition } from '../../helpers/statusbar'

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
    const IconComponent = elementType?.icon || X // Fallback icon
    const typeName: string = elementType?.name || itemTypeKey || 'Unknown'

    return (
      <Draggable key={item} draggableId={item} index={index}>
        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`relative group bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-all duration-200 ${snapshot.isDragging ? 'shadow-lg scale-105' : ''}`}
            style={{
              ...provided.draggableProps.style,
            }}
          >
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                onClick={this.handleDeleteClick}
                aria-label="Delete item"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center p-2 min-h-12">
              <div className="mb-1">
                <IconComponent className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-gray-600 text-center">{typeName}</span>
            </div>
            
          </div>
        )}
      </Draggable>
    )
  }
}

export default StatusBarElement