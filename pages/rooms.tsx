import React, { useState, useEffect } from "react";
import Frame from "../components/Admin/Frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { DoorOpen, Edit, Trash2, Plus, Users, Building } from "lucide-react";
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
  creation_date: string;
}

interface IRoomFormData {
  name: string;
  building_id: string;
  capacity: number;
  facilities: string;
}

// Add validation helper
const validateRoomForm = (data: IRoomFormData): string | null => {
  if (!data.name.trim()) {
    return "Room name is required";
  }
  if (!data.building_id) {
    return "Building is required";
  }
  if (data.capacity < 1) {
    return "Capacity must be at least 1";
  }
  return null;
};

const RoomsPage = () => {
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [buildings, setBuildings] = useState<IBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<IRoom | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [formData, setFormData] = useState<IRoomFormData>({
    name: "",
    building_id: "",
    capacity: 1,
    facilities: "",
  });

  useEffect(() => {
    fetchBuildings();
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchRooms();
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
      setLoading(true);
      const url = selectedBuilding === "all"
        ? "/api/v1/rooms?limit=100"
        : `/api/v1/rooms?building_id=${selectedBuilding}&limit=100`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before making API call
    const validationError = validateRoomForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const facilitiesArray = formData.facilities
        .split(",")
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const response = await fetch("/api/v1/rooms", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          building_id: formData.building_id,
          capacity: formData.capacity,
          facilities: facilitiesArray,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.errors) {
          // If we have validation errors, show them in detail
          const errorMessages = data.errors.map((err: any) => err.message).join(", ");
          toast.error(errorMessages);
          return;
        }
        throw new Error(data.message || "Failed to create room");
      }

      toast.success("Room created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchRooms();
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast.error(error.message || "Failed to create room");
    }
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    try {
      const facilitiesArray = formData.facilities
        .split(",")
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const response = await fetch(`/api/v1/rooms/${editingRoom._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          facilities: facilitiesArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update room");
      }

      toast.success("Room updated successfully");
      setIsEditDialogOpen(false);
      setEditingRoom(null);
      resetForm();
      fetchRooms();
    } catch (error: any) {
      console.error("Error updating room:", error);
      toast.error(error.message || "Failed to update room");
    }
  };

  const handleDeleteRoom = async (room: IRoom) => {
    if (!confirm(`Are you sure you want to delete "${room.name}"?`)) return;

    try {
      const response = await fetch(`/api/v1/rooms/${room._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete room");
      }

      toast.success("Room deleted successfully");
      fetchRooms();
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast.error(error.message || "Failed to delete room");
    }
  };

  const openEditDialog = (room: IRoom) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      building_id: room.building_id._id,
      capacity: room.capacity,
      facilities: room.facilities.join(", "),
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      building_id: "",
      capacity: 1,
      facilities: "",
    });
    setEditingRoom(null);
  };

  return (
    <Frame loggedIn={true}>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Meeting Rooms</h1>
            <p className='text-muted-foreground'>
              Manage meeting rooms across your buildings
            </p>
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
                <Plus className='mr-2 h-4 w-4' />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRoom} className='space-y-4'>
                <div>
                  <Label htmlFor='name'>Room Name</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='Enter room name'
                    required
                  />
                </div>
                <div>
                  <Label htmlFor='building'>Building</Label>
                  <Select
                    value={formData.building_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, building_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select a building' />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building._id} value={building._id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor='capacity'>Capacity</Label>
                  <Input
                    id='capacity'
                    type='number'
                    min='1'
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor='facilities'>Facilities (comma-separated)</Label>
                  <Input
                    id='facilities'
                    value={formData.facilities}
                    onChange={(e) =>
                      setFormData({ ...formData, facilities: e.target.value })
                    }
                    placeholder='Projector, Whiteboard, Video Conference'
                  />
                </div>
                <div className='flex justify-end space-x-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type='submit'>Create Room</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className='flex items-center space-x-4'>
          <Label htmlFor='building-filter'>Filter by Building:</Label>
          <Select
            value={selectedBuilding}
            onValueChange={setSelectedBuilding}
          >
            <SelectTrigger className='w-[200px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Buildings</SelectItem>
              {buildings.map((building) => (
                <SelectItem key={building._id} value={building._id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <DoorOpen className='mr-2 h-5 w-5' />
              Rooms List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='text-center py-8'>Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No rooms found. Create your first room to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Name</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Facilities</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room._id}>
                      <TableCell className='font-medium'>{room.name}</TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          <Building className='mr-1 h-4 w-4 text-muted-foreground' />
                          {room.building_id.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          <Users className='mr-1 h-4 w-4 text-muted-foreground' />
                          {room.capacity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {room.facilities.map((facility, index) => (
                            <Badge key={index} variant='secondary' className='text-xs'>
                              {facility}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex space-x-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => openEditDialog(room)}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleDeleteRoom(room)}
                          >
                            <Trash2 className='h-4 w-4' />
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

        {/* Edit Dialog */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditRoom} className='space-y-4'>
              <div>
                <Label htmlFor='edit-name'>Room Name</Label>
                <Input
                  id='edit-name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Enter room name'
                  required
                />
              </div>
              <div>
                <Label htmlFor='edit-building'>Building</Label>
                <Select
                  value={formData.building_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, building_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select a building' />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building._id} value={building._id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor='edit-capacity'>Capacity</Label>
                <Input
                  id='edit-capacity'
                  type='number'
                  min='1'
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='edit-facilities'>Facilities (comma-separated)</Label>
                <Input
                  id='edit-facilities'
                  value={formData.facilities}
                  onChange={(e) =>
                    setFormData({ ...formData, facilities: e.target.value })
                  }
                  placeholder='Projector, Whiteboard, Video Conference'
                />
              </div>
              <div className='flex justify-end space-x-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type='submit'>Update Room</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Frame>
  );
};

export default RoomsPage;
