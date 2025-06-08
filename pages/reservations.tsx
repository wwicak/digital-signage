import React, { useState, useEffect } from "react";
import Frame from "../components/Admin/Frame";
import CalendarView from "@/components/Calendar/CalendarView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Edit,
  Trash2,
  Plus,
  Clock,
  User,
  Building,
  DoorOpen,
  CalendarDays,
  List,
} from "lucide-react";
import { toast } from "sonner";

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

interface IReservationFormData {
  title: string;
  room_id: string;
  start_time: string;
  end_time: string;
  organizer: string;
  attendees: string;
  agenda_meeting: string;
}

const ReservationsPage = () => {
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [buildings, setBuildings] = useState<IBuilding[]>([]);
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<IReservation | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formData, setFormData] = useState<IReservationFormData>({
    title: "",
    room_id: "",
    start_time: "",
    end_time: "",
    organizer: "",
    attendees: "",
    agenda_meeting: "",
  });

  useEffect(() => {
    fetchBuildings();
    fetchRooms();
    fetchReservations();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [selectedBuilding, selectedRoom, dateFilter]);

  useEffect(() => {
    if (selectedBuilding !== "all") {
      fetchRoomsByBuilding(selectedBuilding);
    } else {
      fetchRooms();
    }
  }, [selectedBuilding]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch("/api/v1/buildings?limit=100");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      const data = await response.json();
      setBuildings(data.buildings || []);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      toast.error("Failed to load buildings");
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/v1/rooms?limit=100");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
    }
  };

  const fetchRoomsByBuilding = async (buildingId: string) => {
    try {
      const response = await fetch(`/api/v1/rooms?building_id=${buildingId}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      let url = "/api/v1/reservations?limit=100";
      
      const params = new URLSearchParams();
      if (selectedBuilding !== "all") {
        params.append("building_id", selectedBuilding);
      }
      if (selectedRoom !== "all") {
        params.append("room_id", selectedRoom);
      }
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(dateFilter);
        endDate.setDate(endDate.getDate() + 1);
        params.append("start_date", startDate.toISOString());
        params.append("end_date", endDate.toISOString());
      }
      
      if (params.toString()) {
        url += "&" + params.toString();
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch reservations");
      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      toast.error("Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const attendeesArray = formData.attendees
        .split(",")
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const response = await fetch("/api/v1/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          attendees: attendeesArray,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create reservation");
      }

      toast.success("Reservation created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchReservations();
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      toast.error(error.message || "Failed to create reservation");
    }
  };

  const handleEditReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReservation) return;

    try {
      const attendeesArray = formData.attendees
        .split(",")
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const response = await fetch(`/api/v1/reservations/${editingReservation._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          attendees: attendeesArray,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update reservation");
      }

      toast.success("Reservation updated successfully");
      setIsEditDialogOpen(false);
      setEditingReservation(null);
      resetForm();
      fetchReservations();
    } catch (error: any) {
      console.error("Error updating reservation:", error);
      toast.error(error.message || "Failed to update reservation");
    }
  };

  const handleDeleteReservation = async (reservation: IReservation) => {
    if (!confirm(`Are you sure you want to delete "${reservation.title}"?`)) return;

    try {
      const response = await fetch(`/api/v1/reservations/${reservation._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete reservation");
      }

      toast.success("Reservation deleted successfully");
      fetchReservations();
    } catch (error: any) {
      console.error("Error deleting reservation:", error);
      toast.error(error.message || "Failed to delete reservation");
    }
  };

  const openEditDialog = (reservation: IReservation) => {
    setEditingReservation(reservation);
    setFormData({
      title: reservation.title,
      room_id: reservation.room_id._id,
      start_time: new Date(reservation.start_time).toISOString().slice(0, 16),
      end_time: new Date(reservation.end_time).toISOString().slice(0, 16),
      organizer: reservation.organizer,
      attendees: reservation.attendees.join(", "),
      agenda_meeting: reservation.agenda_meeting || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      room_id: "",
      start_time: "",
      end_time: "",
      organizer: "",
      attendees: "",
      agenda_meeting: "",
    });
    setEditingReservation(null);
  };

  const getSourceBadge = (reservation: IReservation) => {
    if (reservation.isExternallyManaged) {
      switch (reservation.sourceCalendarType) {
        case "google":
          return <Badge variant="outline" className="text-blue-600">Google</Badge>;
        case "outlook":
          return <Badge variant="outline" className="text-orange-600">Outlook</Badge>;
        default:
          return <Badge variant="outline">External</Badge>;
      }
    }
    return <Badge variant="secondary">Internal</Badge>;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Frame loggedIn={true}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
            <p className="text-muted-foreground">
              Manage meeting room reservations and calendar sync
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Reservation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Reservation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateReservation} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Meeting Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="Enter meeting title"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="organizer">Organizer</Label>
                      <Input
                        id="organizer"
                        value={formData.organizer}
                        onChange={(e) =>
                          setFormData({ ...formData, organizer: e.target.value })
                        }
                        placeholder="Enter organizer name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="room">Room</Label>
                    <Select
                      value={formData.room_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, room_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room._id} value={room._id}>
                            {room.building_id.name} - {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) =>
                          setFormData({ ...formData, start_time: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) =>
                          setFormData({ ...formData, end_time: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="attendees">Attendees (comma-separated)</Label>
                    <Input
                      id="attendees"
                      value={formData.attendees}
                      onChange={(e) =>
                        setFormData({ ...formData, attendees: e.target.value })
                      }
                      placeholder="john@example.com, jane@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="agenda">Agenda</Label>
                    <Textarea
                      id="agenda"
                      value={formData.agenda_meeting}
                      onChange={(e) =>
                        setFormData({ ...formData, agenda_meeting: e.target.value })
                      }
                      placeholder="Enter meeting agenda"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Reservation</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="date-filter">Date:</Label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="building-filter">Building:</Label>
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building._id} value={building._id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="room-filter">Room:</Label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room._id} value={room._id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reservations Content */}
        {viewMode === "calendar" ? (
          <CalendarView
            reservations={reservations}
            onReservationClick={openEditDialog}
            onDateClick={(date) => {
              setDateFilter(date.toISOString().split("T")[0]);
              setViewMode("list");
            }}
            selectedDate={dateFilter ? new Date(dateFilter) : new Date()}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Reservations List
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading reservations...</div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reservations found for the selected filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow key={reservation._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{reservation.title}</div>
                            {reservation.agenda_meeting && (
                              <div className="text-sm text-muted-foreground">
                                {reservation.agenda_meeting}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building className="mr-1 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{reservation.room_id.building_id.name}</span>
                          </div>
                          <div className="flex items-center">
                            <DoorOpen className="mr-1 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{reservation.room_id.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">{formatDate(reservation.start_time)}</div>
                              <div className="text-sm font-medium">
                                {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-1 h-4 w-4 text-muted-foreground" />
                            <span>{reservation.organizer}</span>
                          </div>
                          {reservation.attendees.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              +{reservation.attendees.length} attendees
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getSourceBadge(reservation)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(reservation)}
                              disabled={reservation.isExternallyManaged}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReservation(reservation)}
                              disabled={reservation.isExternallyManaged}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Reservation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditReservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title">Meeting Title</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter meeting title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-organizer">Organizer</Label>
                  <Input
                    id="edit-organizer"
                    value={formData.organizer}
                    onChange={(e) =>
                      setFormData({ ...formData, organizer: e.target.value })
                    }
                    placeholder="Enter organizer name"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-room">Room</Label>
                <Select
                  value={formData.room_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, room_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room._id} value={room._id}>
                        {room.building_id.name} - {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start_time">Start Time</Label>
                  <Input
                    id="edit-start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end_time">End Time</Label>
                  <Input
                    id="edit-end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-attendees">Attendees (comma-separated)</Label>
                <Input
                  id="edit-attendees"
                  value={formData.attendees}
                  onChange={(e) =>
                    setFormData({ ...formData, attendees: e.target.value })
                  }
                  placeholder="john@example.com, jane@example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-agenda">Agenda</Label>
                <Textarea
                  id="edit-agenda"
                  value={formData.agenda_meeting}
                  onChange={(e) =>
                    setFormData({ ...formData, agenda_meeting: e.target.value })
                  }
                  placeholder="Enter meeting agenda"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Reservation</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Frame>
  );
};

export default ReservationsPage;
