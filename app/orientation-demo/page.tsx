'use client'

import React, { useState } from 'react'
import ScreenCardDemo from '../../components/Admin/ScreenCardDemo'

// Mock display data for demonstration
const mockDisplays = [
  {
    _id: '1',
    name: 'Main Lobby Display',
    orientation: 'landscape' as const,
    widgets: ['widget1', 'widget2', 'widget3']
  },
  {
    _id: '2', 
    name: 'Conference Room Display',
    orientation: 'portrait' as const,
    widgets: ['widget1', 'widget2']
  },
  {
    _id: '3',
    name: 'Reception Display',
    orientation: 'landscape' as const,
    widgets: ['widget1']
  }
]

export default function OrientationDemo() {
  const [displays, setDisplays] = useState(mockDisplays)

  const handleOrientationChange = (id: string, orientation: 'landscape' | 'portrait') => {
    setDisplays(prev => prev.map(display =>
      display._id === id ? { ...display, orientation } : display
    ))
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ 
        fontFamily: 'Open Sans, sans-serif', 
        fontSize: '24px', 
        color: '#4f4f4f',
        marginBottom: '40px'
      }}>
        Display Orientation Demo
      </h1>
      
      <p style={{ 
        fontFamily: 'Open Sans, sans-serif', 
        fontSize: '16px', 
        color: '#666',
        marginBottom: '40px',
        lineHeight: '1.5'
      }}>
        This demo showcases the new orientation controls for displays. Each screen card now includes:
      </p>
      
      <ul style={{ 
        fontFamily: 'Open Sans, sans-serif', 
        fontSize: '14px', 
        color: '#666',
        marginBottom: '40px',
        lineHeight: '1.6'
      }}>
        <li>A visual preview showing the current orientation (landscape/portrait)</li>
        <li>A dropdown to change between landscape and portrait orientations</li>
        <li>Real-time updates when orientation is changed</li>
      </ul>

      <div>
        {displays.map((display) => (
          <ScreenCardDemo
            key={display._id}
            value={display}
            onOrientationChange={handleOrientationChange}
          />
        ))}
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        fontFamily: 'Open Sans, sans-serif',
        fontSize: '14px',
        color: '#666'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4f4f4f' }}>Implementation Notes:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Added <code>orientation</code> property to IDisplayData interface</li>
          <li>Updated DisplayContext to handle orientation state management</li>
          <li>Created OrientationPreview component for visual feedback</li>
          <li>Integrated with useDisplayMutations for backend updates</li>
          <li>Added proper TypeScript types and validation</li>
        </ul>
      </div>
    </div>
  )
}