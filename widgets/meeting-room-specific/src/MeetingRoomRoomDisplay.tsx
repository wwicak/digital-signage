import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Calendar } from "lucide-react";

interface IRoom {
  _id: string;
  name: string;
  building_id: {
    _id: string;
    name: string;
  };
  capacity: number;
}

interface IReservation {
  _id: string;
  title: string;
  room_id: IRoom;
  start_time: string;
  end_time: string;
  organizer: string;
  attendees: string[];
  agenda_meeting: string;
}

interface IMeetingRoomRoomDisplayProps {
  roomId?: string;
  refreshInterval?: number;
}

const MeetingRoomRoomDisplay: React.FC<IMeetingRoomRoomDisplayProps> = ({
  roomId,
  refreshInterval = 30000,
}) => {
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [room, setRoom] = useState<IRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [roomName, setRoomName] = useState<string>("Loading...");

  useEffect(() => {
    if (roomId) {
      fetchRoomAndReservations();
      const interval = setInterval(fetchRoomAndReservations, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [roomId, refreshInterval]);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const fetchRoomAndReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch room details if roomId is provided
      if (roomId) {
        const roomResponse = await fetch(`/api/v1/rooms/${roomId}`);
        if (roomResponse.ok) {
          const roomData = await roomResponse.json();
          setRoom(roomData);
          setRoomName(roomData.name || "Room");
        } else {
          setRoomName("Room");
        }
      }

      // Fetch reservations
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let url = `/api/v1/reservations?start_date=${today.toISOString()}&end_date=${tomorrow.toISOString()}&limit=10`;

      if (roomId) {
        url += `&room_id=${roomId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Meeting room API is not yet configured.");
          setReservations([]);
          return;
        }
        throw new Error("Failed to fetch reservations");
      }

      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      const errorMsg = error instanceof Error ? error.message : "";
      setError(errorMsg || "Failed to load data");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentlyBooked = (reservations: IReservation[]): boolean => {
    const now = new Date();
    return reservations.some(res => {
      const start = new Date(res.start_time);
      const end = new Date(res.end_time);
      return now >= start && now <= end;
    });
  };

  const getCurrentMeeting = (reservations: IReservation[]): IReservation | null => {
    const now = new Date();
    return reservations.find(res => {
      const start = new Date(res.start_time);
      const end = new Date(res.end_time);
      return now >= start && now <= end;
    }) || null;
  };

  const getNextMeeting = (reservations: IReservation[]): IReservation | null => {
    const now = new Date();
    const upcoming = reservations
      .filter(res => new Date(res.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return upcoming[0] || null;
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const isBooked = isCurrentlyBooked(reservations);
  const currentMeeting = getCurrentMeeting(reservations);
  const nextMeeting = getNextMeeting(reservations);

  return (
    <div className={`w-full h-full flex flex-col  `}>
      {/* Top row: 50% height - Room name and status */}
      <div className={`h-1/2 flex flex-col items-center justify-center border-b border-gray-200 ${isBooked ? 'bg-red-500' : 'bg-green-500' }`}>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">{room?.name || "Room"}</h1>
        <div className={`px-6 py-3 rounded-full text-white text-2xl font-semibold ${
          isBooked ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {isBooked ? 'BOOKED' : 'AVAILABLE'}
        </div>
        {currentMeeting && (
          <div className="mt-3 text-center">
            <p className="text-lg text-gray-600">Currently: {currentMeeting.title}</p>
            <p className="text-sm text-gray-500">
              Until {formatTime(currentMeeting.end_time)}
            </p>
          </div>
        )}
      </div>

      {/* Bottom row: 50% height - Next meeting */}
      <div className="h-1/2 flex flex-col items-center justify-center p-6">
        {nextMeeting ? (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Next Meeting</h2>
            <div className="bg-blue-50 rounded-lg p-4 max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{nextMeeting.title}</h3>
              <p className="text-lg text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-2" />
                {formatTime(nextMeeting.start_time)} - {formatTime(nextMeeting.end_time)}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <Users className="inline h-4 w-4 mr-2" />
                {nextMeeting.organizer} + {nextMeeting.attendees.length} attendees
              </p>
              {nextMeeting.agenda_meeting && (
                <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-gray-200">
                  {nextMeeting.agenda_meeting}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800">No Upcoming Meetings</h2>
            <p className="text-gray-600 mt-2">Room is available for booking</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingRoomRoomDisplay;