import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  User,
  Users,
  Building,
  DoorOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface IBuilding {
  _id: string;
  name: string;
  address: string;
}

interface IRoom {
  _id: string;
  name: string;
  building_id: IBuilding;
  capacity: number;
  facilities: string[];
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
  sourceCalendarType?: "google" | "outlook" | "internal";
  isExternallyManaged?: boolean;
}

interface IMeetingRoomDisplayProps {
  buildingId?: string;
  refreshInterval?: number;
  showUpcoming?: boolean;
  maxReservations?: number;
}

const MeetingRoomDisplay: React.FC<IMeetingRoomDisplayProps> = ({
  buildingId,
  refreshInterval = 30000, // 30 seconds
  showUpcoming = true,
  maxReservations = 10,
}) => {
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [buildingName, setBuildingName] = useState<string>("");

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, refreshInterval);
    return () => clearInterval(interval);
  }, [buildingId, refreshInterval]);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let url = `/api/v1/reservations?start_date=${today.toISOString()}&end_date=${tomorrow.toISOString()}&limit=${maxReservations}`;

      if (buildingId) {
        url += `&building_id=${buildingId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        // If API is not ready, show a friendly message instead of error
        if (response.status === 404) {
          setError("Meeting room API is not yet configured. Please set up the API endpoints.");
          setReservations([]);
          return;
        }
        throw new Error("Failed to fetch reservations");
      }

      const data = await response.json();
      setReservations(data.reservations || []);

      // Get building name if buildingId is provided
      if (buildingId && data.reservations.length > 0) {
        setBuildingName(data.reservations[0].room_id.building_id.name);
      }
    } catch (error: unknown) {
      console.error("Error fetching reservations:", error);
      // Show a more user-friendly error message
      if (error.message.includes("fetch")) {
        setError("Meeting room system is being set up. Please check back later.");
      } else {
        setError(error.message || "Failed to load reservations");
      }
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentMeeting = (reservation: IReservation): boolean => {
    const now = currentTime.getTime();
    const start = new Date(reservation.start_time).getTime();
    const end = new Date(reservation.end_time).getTime();
    return now >= start && now <= end;
  };

  const isUpcomingMeeting = (reservation: IReservation): boolean => {
    const now = currentTime.getTime();
    const start = new Date(reservation.start_time).getTime();
    return start > now;
  };

  const isPastMeeting = (reservation: IReservation): boolean => {
    const now = currentTime.getTime();
    const end = new Date(reservation.end_time).getTime();
    return end < now;
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusIcon = (reservation: IReservation) => {
    if (isCurrentMeeting(reservation)) {
      return <CheckCircle className='h-4 w-4 text-green-500' />;
    } else if (isUpcomingMeeting(reservation)) {
      return <Clock className='h-4 w-4 text-blue-500' />;
    } else {
      return <XCircle className='h-4 w-4 text-gray-400' />;
    }
  };

  const getStatusBadge = (reservation: IReservation) => {
    if (isCurrentMeeting(reservation)) {
      return <Badge className='bg-green-500'>In Progress</Badge>;
    } else if (isUpcomingMeeting(reservation)) {
      return <Badge variant='outline'>Upcoming</Badge>;
    } else {
      return <Badge variant='secondary'>Completed</Badge>;
    }
  };

  const getSourceBadge = (reservation: IReservation) => {
    if (reservation.isExternallyManaged) {
      switch (reservation.sourceCalendarType) {
        case "google":
          return <Badge variant='outline' className='text-blue-600 text-xs'>Google</Badge>;
        case "outlook":
          return <Badge variant='outline' className='text-orange-600 text-xs'>Outlook</Badge>;
        default:
          return <Badge variant='outline' className='text-xs'>External</Badge>;
      }
    }
    return <Badge variant='secondary' className='text-xs'>Internal</Badge>;
  };

  const currentReservations = reservations.filter(isCurrentMeeting);
  const upcomingReservations = reservations.filter(isUpcomingMeeting);
  const pastReservations = reservations.filter(isPastMeeting);

  if (loading) {
    return (
      <Card className='w-full h-full'>
        <CardContent className='flex items-center justify-center h-full'>
          <div className='text-center'>
            <Clock className='h-8 w-8 animate-spin mx-auto mb-2' />
            <p className='text-muted-foreground'>Loading reservations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='w-full h-full'>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center'>
            <Calendar className='mr-2 h-5 w-5' />
            <span>Meeting Room Display</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='flex items-center justify-center h-full'>
          <div className='text-center'>
            <AlertCircle className='h-8 w-8 text-muted-foreground mx-auto mb-4' />
            <p className='text-muted-foreground mb-2'>{error}</p>
            <p className='text-xs text-muted-foreground'>
              The meeting room system is being configured. This widget will display
              today&apos;s meetings once the API is set up.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full h-full'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center justify-between'>
          <div className='flex items-center'>
            <Calendar className='mr-2 h-5 w-5' />
            <span>Today&apos;s Meetings</span>
            {buildingName && (
              <>
                <Separator orientation='vertical' className='mx-2 h-4' />
                <Building className='mr-1 h-4 w-4 text-muted-foreground' />
                <span className='text-sm text-muted-foreground'>{buildingName}</span>
              </>
            )}
          </div>
          <div className='text-sm text-muted-foreground'>
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {reservations.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            <Calendar className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p className='text-lg font-medium'>No meetings scheduled</p>
            <p className='text-sm'>Enjoy your free day!</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {/* Current Meetings */}
            {currentReservations.length > 0 && (
              <div>
                <h3 className='text-sm font-semibold text-green-600 mb-2 flex items-center'>
                  <CheckCircle className='mr-1 h-4 w-4' />
                  Currently In Progress ({currentReservations.length})
                </h3>
                <div className='space-y-2'>
                  {currentReservations.map((reservation) => (
                    <ReservationCard
                      key={reservation._id}
                      reservation={reservation}
                      getStatusIcon={getStatusIcon}
                      getStatusBadge={getStatusBadge}
                      getSourceBadge={getSourceBadge}
                      formatTime={formatTime}
                      formatDate={formatDate}
                      isHighlighted={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Meetings */}
            {upcomingReservations.length > 0 && showUpcoming && (
              <div>
                <h3 className='text-sm font-semibold text-blue-600 mb-2 flex items-center'>
                  <Clock className='mr-1 h-4 w-4' />
                  Upcoming ({upcomingReservations.length})
                </h3>
                <div className='space-y-2'>
                  {upcomingReservations.slice(0, 5).map((reservation) => (
                    <ReservationCard
                      key={reservation._id}
                      reservation={reservation}
                      getStatusIcon={getStatusIcon}
                      getStatusBadge={getStatusBadge}
                      getSourceBadge={getSourceBadge}
                      formatTime={formatTime}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Meetings */}
            {pastReservations.length > 0 && (
              <div>
                <h3 className='text-sm font-semibold text-gray-500 mb-2 flex items-center'>
                  <XCircle className='mr-1 h-4 w-4' />
                  Completed ({pastReservations.length})
                </h3>
                <div className='space-y-2'>
                  {pastReservations.slice(0, 3).map((reservation) => (
                    <ReservationCard
                      key={reservation._id}
                      reservation={reservation}
                      getStatusIcon={getStatusIcon}
                      getStatusBadge={getStatusBadge}
                      getSourceBadge={getSourceBadge}
                      formatTime={formatTime}
                      formatDate={formatDate}
                      isCompleted={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface IReservationCardProps {
  reservation: IReservation;
  getStatusIcon: (reservation: IReservation) => React.ReactNode;
  getStatusBadge: (reservation: IReservation) => React.ReactNode;
  getSourceBadge: (reservation: IReservation) => React.ReactNode;
  formatTime: (dateString: string) => string;
  formatDate: (dateString: string) => string;
  isHighlighted?: boolean;
  isCompleted?: boolean;
}

const ReservationCard: React.FC<IReservationCardProps> = ({
  reservation,
  getStatusIcon,
  getStatusBadge,
  getSourceBadge,
  formatTime,
  formatDate,
  isHighlighted = false,
  isCompleted = false,
}) => {
  return (
    <Card className={`p-3 ${isHighlighted ? "border-green-200 bg-green-50" : ""} ${isCompleted ? "opacity-60" : ""}`}>
      <div className='space-y-2'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center space-x-2'>
              {getStatusIcon(reservation)}
              <h4 className='font-medium text-sm'>{reservation.title}</h4>
              {getStatusBadge(reservation)}
            </div>
            <div className='flex items-center space-x-4 mt-1 text-xs text-muted-foreground'>
              <div className='flex items-center'>
                <DoorOpen className='mr-1 h-3 w-3' />
                <span>{reservation.room_id.name}</span>
              </div>
              <div className='flex items-center'>
                <Clock className='mr-1 h-3 w-3' />
                <span>
                  {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                </span>
              </div>
            </div>
          </div>
          <div className='flex flex-col items-end space-y-1'>
            {getSourceBadge(reservation)}
          </div>
        </div>
        
        <div className='flex items-center justify-between text-xs'>
          <div className='flex items-center'>
            <User className='mr-1 h-3 w-3 text-muted-foreground' />
            <span className='text-muted-foreground'>{reservation.organizer}</span>
            {reservation.attendees.length > 0 && (
              <>
                <Users className='ml-2 mr-1 h-3 w-3 text-muted-foreground' />
                <span className='text-muted-foreground'>+{reservation.attendees.length}</span>
              </>
            )}
          </div>
        </div>
        
        {reservation.agenda_meeting && (
          <div className='text-xs text-muted-foreground bg-muted/50 p-2 rounded'>
            <strong>Agenda:</strong> {reservation.agenda_meeting}
          </div>
        )}
      </div>
    </Card>
  );
};

export default MeetingRoomDisplay;
