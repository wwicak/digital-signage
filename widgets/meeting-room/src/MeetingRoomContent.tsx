import React from 'react'
import MeetingRoomDisplay from '../../../components/Widgets/MeetingRoomDisplay'
import { IWidgetContentProps } from '../../base_widget'

interface IMeetingRoomData {
  buildingId?: string;
  refreshInterval?: number;
  showUpcoming?: boolean;
  maxReservations?: number;
  title?: string;
}

const MeetingRoomContent: React.FC<IWidgetContentProps<IMeetingRoomData>> = ({ data = {} }) => {
  const {
    buildingId,
    refreshInterval = 30000,
    showUpcoming = true,
    maxReservations = 10,
  } = data

  return (
    <div className='w-full h-full'>
      <MeetingRoomDisplay
        buildingId={buildingId}
        refreshInterval={refreshInterval}
        showUpcoming={showUpcoming}
        maxReservations={maxReservations}
      />
    </div>
  )
}

export default MeetingRoomContent
