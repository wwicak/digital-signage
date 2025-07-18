import React, { useState, useEffect } from 'react'
import { Input } from '../../../components/Form'
import { IWidgetOptionsEditorProps } from '../../base_widget'

interface IMeetingRoomSpecificData {
  roomId?: string;
  refreshInterval?: number;
  showUpcoming?: boolean;
  maxReservations?: number;
  title?: string;
}

interface IRoom {
  _id: string;
  name: string;
  building_id: {
    _id: string;
    name: string;
  };
  capacity: number;
}

const MeetingRoomSpecificOptions: React.FC<IWidgetOptionsEditorProps<IMeetingRoomSpecificData>> = ({
  data = {},
  onChange,
}) => {
  const [rooms, setRooms] = useState<IRoom[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/rooms?limit=100&populate=building_id')
      if (response.ok) {
        const result = await response.json()
        setRooms(result.rooms || [])
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
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

  const roomChoices = [
    { id: '', label: 'Select a room...' },
    ...rooms.map(room => ({
      id: room._id,
      label: `${room.name} (${room.building_id.name}) - ${room.capacity} people`,
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
        name='roomId'
        label='Meeting Room'
        value={data.roomId || ''}
        onChange={handleChange}
        choices={roomChoices}
        helpText='Select a specific meeting room to display reservations for'
      />

      <Input
        type='number'
        name='refreshInterval'
        label='Refresh Interval (seconds)'
        value={Math.floor((data.refreshInterval || 30000) / 1000)}
        onChange={(name, value) => handleChange(name, (typeof value === 'number' ? value : Number(value) || 30) * 1000)}
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

export default MeetingRoomSpecificOptions
