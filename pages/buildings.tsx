import React, { useState, useEffect } from "react";

import { useRouter } from "next/router";
import Frame from "../components/Admin/Frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Building, Edit, Trash2, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";

interface IBuilding {
  _id: string;
  name: string;
  address: string;
  creation_date: string;
  last_update: string;
}

interface IBuildingFormData {
  name: string;
  address: string;
}

const BuildingsPage = () => {
  const router = useRouter();
  const [buildings, setBuildings] = useState<IBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<IBuilding | null>(null);
  const [formData, setFormData] = useState<IBuildingFormData>({
    name: "",
    address: "",
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/buildings");
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      const data = await response.json();
      setBuildings(data.buildings || []);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      toast.error("Failed to load buildings");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/v1/buildings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create building");
      }

      toast.success("Building created successfully");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", address: "" });
      fetchBuildings();
    } catch (error) { // TypeScript will infer error as unknown
      console.error("Error creating building:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create building"); // Type-safe error handling
    }
  };

  const handleEditBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;

    try {
      const response = await fetch(`/api/v1/buildings/${editingBuilding._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update building");
      }

      toast.success("Building updated successfully");
      setIsEditDialogOpen(false);
      setEditingBuilding(null);
      setFormData({ name: "", address: "" });
      fetchBuildings();
    } catch (error) { // TypeScript will infer error as unknown
      console.error("Error updating building:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update building"); // Type-safe error handling
    }
  };

  const handleDeleteBuilding = async (building: IBuilding) => {
    if (!confirm(`Are you sure you want to delete "${building.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/buildings/${building._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete building");
      }

      toast.success("Building deleted successfully");
      fetchBuildings();
    } catch (error) { // TypeScript will infer error as unknown
      console.error("Error deleting building:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete building"); // Type-safe error handling
    }
  };

  const openEditDialog = (building: IBuilding) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      address: building.address,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", address: "" });
    setEditingBuilding(null);
  };

  return (
    <Frame loggedIn={true}>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Buildings</h1>
            <p className='text-muted-foreground'>
              Manage buildings for your meeting room system
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
                Add Building
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Building</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateBuilding} className='space-y-4'>
                <div>
                  <Label htmlFor='name'>Building Name</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='Enter building name'
                    required
                  />
                </div>
                <div>
                  <Label htmlFor='address'>Address</Label>
                  <Input
                    id='address'
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder='Enter building address'
                    required
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
                  <Button type='submit'>Create Building</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <Building className='mr-2 h-5 w-5' />
              Buildings List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='text-center py-8'>Loading buildings...</div>
            ) : buildings.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No buildings found. Create your first building to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildings.map((building) => (
                    <TableRow key={building._id}>
                      <TableCell className='font-medium'>
                        {building.name}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          <MapPin className='mr-1 h-4 w-4 text-muted-foreground' />
                          {building.address}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(building.creation_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className='flex space-x-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => openEditDialog(building)}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleDeleteBuilding(building)}
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
              <DialogTitle>Edit Building</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditBuilding} className='space-y-4'>
              <div>
                <Label htmlFor='edit-name'>Building Name</Label>
                <Input
                  id='edit-name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Enter building name'
                  required
                />
              </div>
              <div>
                <Label htmlFor='edit-address'>Address</Label>
                <Input
                  id='edit-address'
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder='Enter building address'
                  required
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
                <Button type='submit'>Update Building</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Frame>
  );
};

export default BuildingsPage;
