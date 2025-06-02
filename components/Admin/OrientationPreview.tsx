import React from 'react'

interface OrientationPreviewProps {
  orientation: 'landscape' | 'portrait' | null
}

const OrientationPreview: React.FC<OrientationPreviewProps> = ({ orientation }) => {
  const isLandscape = orientation === 'landscape'
  const isPortrait = orientation === 'portrait'
  
  return (
    <div className="orientation-preview">
      <div className={`screen ${orientation || 'landscape'}`}>
        <div className="screen-content">
          {orientation ? orientation.charAt(0).toUpperCase() + orientation.slice(1) : 'Default'}
        </div>
      </div>
      <style jsx>{`
        .orientation-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px 0;
        }
        
        .screen {
          border: 2px solid #ddd;
          border-radius: 4px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease-in-out;
          position: relative;
        }
        
        .screen.landscape {
          width: 40px;
          height: 24px;
        }
        
        .screen.portrait {
          width: 24px;
          height: 40px;
        }
        
        .screen-content {
          font-size: 8px;
          color: #666;
          font-weight: 500;
          text-align: center;
          line-height: 1;
          transform: ${isPortrait ? 'rotate(-90deg)' : 'none'};
          white-space: nowrap;
        }
        
        .screen:hover {
          border-color: #7bc043;
          background: #f0f8e8;
        }
      `}</style>
    </div>
  )
}

export default OrientationPreview