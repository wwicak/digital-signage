import React from 'react';
import { Monitor, Image, Type, List, Video, Calendar, Clock, BarChart3, Users } from 'lucide-react';

interface LayoutWidget {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  widget_id?: {
    _id?: string;
    type?: string;
    name?: string;
  };
}

interface LayoutData {
  orientation?: string;
  gridConfig?: {
    cols?: number;
    rows?: number;
  };
  widgets?: LayoutWidget[];
  statusBar?: {
    enabled?: boolean;
    color?: string;
  };
}

interface LayoutPreviewProps {
  layout: LayoutData | null | undefined;
  className?: string;
  scale?: number;
}

// Widget type to icon mapping
const getWidgetIcon = (widgetType: string) => {
  const type = widgetType.toLowerCase();
  switch (type) {
    case 'image':
      return Image;
    case 'text':
    case 'announcement':
      return Type;
    case 'list':
      return List;
    case 'video':
    case 'media-player':
    case 'priority-video':
      return Video;
    case 'calendar':
      return Calendar;
    case 'clock':
      return Clock;
    case 'chart':
      return BarChart3;
    case 'meeting-room':
      return Users;
    default:
      return Monitor;
  }
};

// Widget type to color mapping
const getWidgetColor = (widgetType: string) => {
  const type = widgetType.toLowerCase();
  switch (type) {
    case 'image':
      return 'bg-green-100 border-green-300 text-green-700';
    case 'text':
    case 'announcement':
      return 'bg-blue-100 border-blue-300 text-blue-700';
    case 'list':
      return 'bg-purple-100 border-purple-300 text-purple-700';
    case 'video':
    case 'media-player':
    case 'priority-video':
      return 'bg-red-100 border-red-300 text-red-700';
    case 'calendar':
      return 'bg-orange-100 border-orange-300 text-orange-700';
    case 'clock':
      return 'bg-yellow-100 border-yellow-300 text-yellow-700';
    case 'chart':
      return 'bg-indigo-100 border-indigo-300 text-indigo-700';
    case 'meeting-room':
      return 'bg-pink-100 border-pink-300 text-pink-700';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-700';
  }
};

const LayoutPreview: React.FC<LayoutPreviewProps> = ({
  layout,
  className = '',
  scale = 0.3
}) => {
  if (!layout) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className='text-center text-gray-500'>
          <Monitor className='h-8 w-8 mx-auto mb-2' />
          <p className='text-sm'>No layout data</p>
        </div>
      </div>
    );
  }

  const isPortrait = layout.orientation === 'portrait';
  const gridCols = layout.gridConfig?.cols || (isPortrait ? 9 : 16);
  const gridRows = layout.gridConfig?.rows || (isPortrait ? 16 : 9);
  
  // Calculate container dimensions
  const baseWidth = isPortrait ? 360 : 640;
  const baseHeight = isPortrait ? 640 : 360;
  const containerWidth = baseWidth * scale;
  const containerHeight = baseHeight * scale;

  // Calculate cell dimensions
  const cellWidth = containerWidth / gridCols;
  const cellHeight = containerHeight / gridRows;

  const widgets = layout.widgets || [];

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Container with proper aspect ratio */}
      <div
        className='relative'
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
        }}
      >
        {/* Grid background (optional, for debugging) */}
        <div
          className='absolute inset-0 opacity-10'
          style={{
            backgroundImage: `
              linear-gradient(to right, #fff 1px, transparent 1px),
              linear-gradient(to bottom, #fff 1px, transparent 1px)
            `,
            backgroundSize: `${cellWidth}px ${cellHeight}px`,
          }}
        />

        {/* Render widgets */}
        {widgets.map((widget: LayoutWidget, index: number) => {
          const widgetData = widget.widget_id;
          if (!widgetData || !widgetData.type) return null;

          const x = widget.x || 0;
          const y = widget.y || 0;
          const w = widget.w || 1;
          const h = widget.h || 1;

          const left = x * cellWidth;
          const top = y * cellHeight;
          const width = w * cellWidth;
          const height = h * cellHeight;

          const IconComponent = getWidgetIcon(widgetData.type);
          const colorClass = getWidgetColor(widgetData.type);

          return (
            <div
              key={widgetData._id || index}
              className={`absolute border-2 rounded ${colorClass} flex items-center justify-center`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              <div className='text-center'>
                <IconComponent
                  className='mx-auto mb-1'
                  style={{
                    width: `${Math.min(width * 0.3, height * 0.3, 16)}px`,
                    height: `${Math.min(width * 0.3, height * 0.3, 16)}px`
                  }}
                />
                <div
                  className='font-medium leading-tight'
                  style={{
                    fontSize: `${Math.max(8, Math.min(width * 0.08, height * 0.08))}px`,
                    lineHeight: '1.1'
                  }}
                >
                  {widgetData.name || widgetData.type}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state if no widgets */}
        {widgets.length === 0 && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='text-center text-white opacity-50'>
              <Monitor className='h-8 w-8 mx-auto mb-2' />
              <p className='text-xs'>Empty Layout</p>
            </div>
          </div>
        )}

        {/* Status bar (if enabled) */}
        {layout.statusBar?.enabled && (
          <div
            className='absolute bottom-0 left-0 right-0 opacity-80'
            style={{
              height: `${containerHeight * 0.05}px`,
              backgroundColor: layout.statusBar.color || '#000000',
            }}
          />
        )}
      </div>

      {/* Layout info overlay */}
      <div className='absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded'>
        {widgets.length} widget{widgets.length !== 1 ? 's' : ''} • {layout.orientation}
      </div>
    </div>
  );
};

export default LayoutPreview;
