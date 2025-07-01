import React, { useState } from 'react'
import { DisplayProvider } from '../contexts/DisplayContext'
import DisplayComponent from '../components/Display/Display'

// Mock display data for testing orientation
interface MockDisplayData {
  _id: string;
  name: string;
  layout: 'spaced' | 'compact';
  orientation: 'landscape' | 'portrait';
  statusBar: {
    enabled: boolean;
    elements: string[];
  };
  widgets: Array<{
    _id: string;
    name: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    data: unknown;
  }>;
}

const mockDisplayData: MockDisplayData = {
  _id: 'test-display-1',
  name: 'Test Display',
  layout: 'spaced',
  orientation: 'landscape',
  statusBar: {
    enabled: true,
    elements: ['time', 'date', 'connection']
  },
  widgets: [
    {
      _id: 'widget-1',
      name: 'Test Announcement',
      type: 'announcement',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      data: {
        text: 'Welcome to our digital signage system!\n\nThis is a test announcement to demonstrate the orientation functionality.',
        color: '#2c3e50',
        textColor: '#ffffff',
        accentColor: '#e74c3c'
      }
    },
    {
      _id: 'widget-2',
      name: 'Test Congrats',
      type: 'congrats',
      x: 3,
      y: 0,
      w: 3,
      h: 2,
      data: {
        text: 'Congratulations!\n\nOrientation support is working!',
        color: '#27ae60',
        textColor: '#ffffff',
        animation: 'confetti'
      }
    }
  ]
}

const DisplayTestPage: React.FC = () => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [displayData, setDisplayData] = useState(mockDisplayData)

  const handleOrientationChange = (newOrientation: 'landscape' | 'portrait') => {
    setOrientation(newOrientation)
    setDisplayData(prev => ({
      ...prev,
      orientation: newOrientation
    }))
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Control Panel */}
      <div style={{
        padding: '10px',
        background: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        zIndex: 1000
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#495057' }}>
          Display Orientation Test
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleOrientationChange('landscape')}
            style={{
              padding: '8px 16px',
              border: '1px solid #007bff',
              background: orientation === 'landscape' ? '#007bff' : 'white',
              color: orientation === 'landscape' ? 'white' : '#007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Landscape
          </button>
          <button
            onClick={() => handleOrientationChange('portrait')}
            style={{
              padding: '8px 16px',
              border: '1px solid #007bff',
              background: orientation === 'portrait' ? '#007bff' : 'white',
              color: orientation === 'portrait' ? 'white' : '#007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Portrait
          </button>
        </div>
        <span style={{ fontSize: '14px', color: '#6c757d' }}>
          Current: {orientation}
        </span>
      </div>

      {/* Display Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#000'
      }}>
        <DisplayProvider>
          <TestDisplayWrapper displayData={displayData} />
        </DisplayProvider>
      </div>
    </div>
  )
}

// Wrapper component to inject mock data into the display context
const TestDisplayWrapper: React.FC<{ displayData: MockDisplayData }> = ({ displayData }) => {
  const [isClient, setIsClient] = React.useState(false)
  
  // Check if we're in a browser environment after component mounts
  React.useEffect(() => {
    setIsClient(true)
  }, [])
  
  // For SSR, render a loading state without using context hooks
  if (!isClient) {
    return <div>Loading display...</div>
  }
  
  // Now we can safely render the client-side component
  return <ClientSideDisplayWrapper displayData={displayData} />
}

// Separate client-side component that uses hooks
const ClientSideDisplayWrapper: React.FC<{ displayData: MockDisplayData }> = ({ displayData }) => {
  const { useDisplayContext } = require('../contexts/DisplayContext')
  const { setId } = useDisplayContext()
  
  React.useEffect(() => {
    // Mock the display data by directly setting it in the context
    if (displayData) {
      // Simulate setting the ID and data
      setId(displayData._id)
    }
  }, [displayData, setId])

  return <DisplayComponent display={displayData._id} />
}

export default DisplayTestPage