import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Building,
  DoorOpen,
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
  creation_date: string;
}

interface ICalendarViewProps {
  reservations: IReservation[];
  onReservationClick?: (reservation: IReservation) => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
}

const CalendarView: React.FC<ICalendarViewProps> = ({
  reservations,
  onReservationClick,
  onDateClick,
  selectedDate = new Date(),
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewMode, setViewMode] = useState<"month" | "day">("month");

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getSourceBadge = (reservation: IReservation) => {
    if (reservation.isExternallyManaged) {
      switch (reservation.sourceCalendarType) {
        case "google":
          return (
            <Badge variant='outline' className='text-blue-600 border-blue-200 bg-blue-50 text-xs'>
              Google
            </Badge>
          );
        case "outlook":
          return (
            <Badge variant='outline' className='text-orange-600 border-orange-200 bg-orange-50 text-xs'>
              Outlook
            </Badge>
          );
        default:
          return (
            <Badge variant='outline' className='text-purple-600 border-purple-200 bg-purple-50 text-xs'>
              External
            </Badge>
          );
      }
    }
    return (
      <Badge variant='secondary' className='text-green-700 bg-green-100 text-xs'>
        Internal
      </Badge>
    );
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const getDateTitle = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString([], { month: "long", year: "numeric" });
    } else {
      return currentDate.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
  };

  const getReservationsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return reservations.filter(reservation => {
      const reservationDate = new Date(reservation.start_time).toDateString();
      return reservationDate === dateStr;
    });
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayReservations = getReservationsForDate(currentDateObj);
      const isCurrentMonth = currentDateObj.getMonth() === month;
      const isToday = currentDateObj.toDateString() === new Date().toDateString();
      
      days.push(
        <div
          key={i}
          className={`min-h-[120px] p-3 border border-gray-200 cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:border-blue-300 ${
            !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
          } ${isToday ? "bg-blue-100 border-blue-400 shadow-md" : ""}`}
          onClick={() => onDateClick?.(new Date(currentDateObj))}
        >
          <div className={`text-sm font-semibold mb-2 ${isToday ? "text-blue-700" : ""}`}>
            {currentDateObj.getDate()}
          </div>
          <div className='space-y-1'>
            {dayReservations.slice(0, 2).map((reservation) => (
              <div
                key={reservation._id}
                className='text-xs p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-sm'
                onClick={(e) => {
                  e.stopPropagation();
                  onReservationClick?.(reservation);
                }}
              >
                <div className='font-medium truncate'>{reservation.title}</div>
                <div className='opacity-90'>
                  {formatTime(reservation.start_time)}
                </div>
              </div>
            ))}
            {dayReservations.length > 2 && (
              <div className='text-xs text-gray-500 font-medium'>
                +{dayReservations.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }

    return (
      <div className='grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden shadow-sm'>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className='p-4 text-center font-semibold bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300 text-gray-700'>
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const dayReservations = getReservationsForDate(currentDate);
    
    return (
      <div className='space-y-4'>
        {dayReservations.length === 0 ? (
          <div className='text-center py-12 text-gray-500'>
            <Calendar className='h-16 w-16 mx-auto mb-4 opacity-30' />
            <p className='text-lg'>No meetings scheduled for this day</p>
            <p className='text-sm'>Click a date with meetings to view details</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {dayReservations
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((reservation) => (
                <Card
                  key={reservation._id}
                  className='cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 hover:border-l-blue-600'
                  onClick={() => onReservationClick?.(reservation)}
                >
                  <CardContent className='p-6'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center space-x-3 mb-3'>
                          <h3 className='text-lg font-semibold text-gray-900'>{reservation.title}</h3>
                          {getSourceBadge(reservation)}
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3'>
                          <div className='flex items-center'>
                            <Clock className='mr-2 h-4 w-4 text-blue-500' />
                            <span className='font-medium'>
                              {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                            </span>
                          </div>
                          <div className='flex items-center'>
                            <Building className='mr-2 h-4 w-4 text-green-500' />
                            <span>{reservation.room_id.building_id.name}</span>
                          </div>
                          <div className='flex items-center'>
                            <DoorOpen className='mr-2 h-4 w-4 text-purple-500' />
                            <span className='font-medium'>{reservation.room_id.name}</span>
                          </div>
                        </div>
                        <div className='flex items-center text-sm text-gray-600 mb-3'>
                          <User className='mr-2 h-4 w-4 text-orange-500' />
                          <span className='font-medium'>{reservation.organizer}</span>
                          {reservation.attendees.length > 0 && (
                            <span className='ml-2 text-gray-500'>
                              +{reservation.attendees.length} attendees
                            </span>
                          )}
                        </div>
                        {reservation.agenda_meeting && (
                          <div className='mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-l-gray-300'>
                            <strong className='text-gray-700'>Agenda:</strong>
                            <p className='text-gray-600 mt-1'>{reservation.agenda_meeting}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className='shadow-lg border-0 bg-white'>
      <CardHeader className='bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-t-lg'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center text-xl'>
            <Calendar className='mr-3 h-6 w-6' />
            {getDateTitle()}
          </CardTitle>
          <div className='flex items-center space-x-3'>
            <div className='flex items-center space-x-1 bg-white/20 rounded-lg p-1'>
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size='sm'
                onClick={() => setViewMode("day")}
                className={viewMode === "day" ? "bg-white text-blue-600" : "text-white hover:bg-white/20"}
              >
                Day
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size='sm'
                onClick={() => setViewMode("month")}
                className={viewMode === "month" ? "bg-white text-blue-600" : "text-white hover:bg-white/20"}
              >
                Month
              </Button>
            </div>
            <div className='flex items-center space-x-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigateDate("prev")}
                className='text-white hover:bg-white/20'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setCurrentDate(new Date())}
                className='text-white hover:bg-white/20 px-3'
              >
                Today
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigateDate("next")}
                className='text-white hover:bg-white/20'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-6'>
        {viewMode === "month" && renderMonthView()}
        {viewMode === "day" && renderDayView()}
      </CardContent>
    </Card>
  );
};

export default CalendarView;
