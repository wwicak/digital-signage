import React, { useState, useEffect } from 'react'
import { Input } from '../../../components/Form'
import { IWidgetOptionsEditorProps } from '../../base_widget'

interface IMeetingRoomData {
  buildingId?: string;
  refreshInterval?: number;
  showUpcoming?: boolean;
  maxReservations?: number;
  title?: string;
}

interface IBuilding {
  _id: string;
  name: string;
  address: string;
}

const MeetingRoomOptions: React.FC<IWidgetOptionsEditorProps<IMeetingRoomData>> = ({
  data = {},
  onChange,
}) => {
  const [buildings, setBuildings] = useState<IBuilding[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBuildings()
  }, [])

  const fetchBuildings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/buildings?limit=100')
      if (response.ok) {
        const result = await response.json()
        setBuildings(result.buildings || [])
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (name: string, value: unknown) => {
    onChange({
      ...data,
      [name]: value,
    })
  }

  const buildingChoices = [
    { id: '', label: 'All Buildings' },
    ...buildings.map(building => ({
      id: building._id,
      label: `${building.name} - ${building.address}`,
    })),
  ]

  return (
    <div className='space-y-4'>
      <Input
        type='text'
        name='title'
        label='Widget Title'
        value={data.title || "Today's Meetings"}
        onChange={handleChange}
        placeholder='Enter widget title'
        helpText='Title displayed at the top of the widget'
      />

      <Input
        type='select'
        name='buildingId'
        label='Building Filter'
        value={data.buildingId || ''}
        onChange={handleChange}
        choices={buildingChoices}
        helpText='Select a specific building or show all buildings'
      />

      <Input
        type='number'
        name='refreshInterval'
        label='Refresh Interval (seconds)'
        value={Math.floor((data.refreshInterval || 30000) / 1000)}
        onChange={(name, value) => handleChange(name, value * 1000)}
        min={5}
        max={300}
        helpText='How often to refresh the meeting data (5-300 seconds)'
      />

      <Input
        type='number'
        name='maxReservations'
        label='Maximum Reservations'
        value={data.maxReservations || 10}
        onChange={handleChange}
        min={1}
        max={50}
        helpText='Maximum number of reservations to display'
      />

      <Input
        type='checkbox'
        name='showUpcoming'
        label='Show Upcoming Meetings'
        checked={data.showUpcoming !== false}
        onChange={(name, value) => handleChange(name, !!value)}
        helpText='Display upcoming meetings in addition to current ones'
      />
    </div>
  )
}

export default MeetingRoomOptions
