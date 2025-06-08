import React from 'react'

interface OrientationPreviewProps {
  orientation: 'landscape' | 'portrait' | null
}

const OrientationPreview: React.FC<OrientationPreviewProps> = ({ orientation }) => {
  const isLandscape = orientation === 'landscape'
  const isPortrait = orientation === 'portrait'

  return (
    <div className="flex items-center justify-center my-1">
      <div className={`border-2 border-gray-300 rounded bg-gray-50 flex items-center justify-center transition-all duration-200 relative hover:border-green-500 hover:bg-green-50 ${
        isPortrait ? 'w-6 h-10' : 'w-10 h-6'
      }`}>
        <div className={`text-xs text-gray-600 font-medium text-center leading-none whitespace-nowrap ${
          isPortrait ? '-rotate-90' : ''
        }`}>
          {orientation ? orientation.charAt(0).toUpperCase() + orientation.slice(1) : 'Default'}
        </div>
      </div>
    </div>
  )
}

export default OrientationPreview