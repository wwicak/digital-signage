import React, { useState, useEffect } from 'react'
import MeetingRoomRoomDisplay from './MeetingRoomRoomDisplay'
import { IWidgetContentProps } from '../../base_widget'

interface IMeetingRoomSpecificData {
  roomId?: string;
  refreshInterval?: number;
}

const MeetingRoomSpecificContent: React.FC<IWidgetContentProps<IMeetingRoomSpecificData>> = ({ data = {} }) => {
  const {
    roomId,
    refreshInterval = 30000,
  } = data

  return (
    <div className='w-full h-full'>
      <MeetingRoomRoomDisplay
        roomId={roomId}
        refreshInterval={refreshInterval}
      />
    </div>
  )
}

export default MeetingRoomSpecificContent
