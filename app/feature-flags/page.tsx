"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  Menu,
  Puzzle,
  Star,
  Plus,
  Edit,
  Trash2,
  Users,
  AlertTriangle,
  Save,
  X
} from "lucide-react";
import {
  useFeatureFlags,
  useUpdateFeatureFlag,
  useDeleteFeatureFlag
} from "@/hooks/useFeatureFlags";
import {
  IFeatureFlag,
  FeatureFlagType
} from "@/lib/types/feature-flags";
import { UserRoleName } from "@/lib/models/User";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Frame from "@/components/Admin/Frame";

const FeatureFlagsPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<FeatureFlagType | "all">("all");
  const [editingFlag, setEditingFlag] = useState<IFeatureFlag | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    displayName: string;
    description: string;
    enabled: boolean;
    allowedRoles: UserRoleName[];
  }>({
    displayName: "",
    description: "",
    enabled: true,
    allowedRoles: []
  });

  const { data: featureFlags, isLoading, error } = useFeatureFlags();
  const updateFeatureFlag = useUpdateFeatureFlag();
  const deleteFeatureFlag = useDeleteFeatureFlag();

  // Filter feature flags by type
  const filteredFlags = featureFlags?.filter(flag =>
    selectedType === "all" || flag.type === selectedType
  ) || [];

  // Group flags by type for better organization
  const flagsByType = {
    [FeatureFlagType.MENU_ITEM]: filteredFlags.filter(f => f.type === FeatureFlagType.MENU_ITEM),
    [FeatureFlagType.WIDGET]: filteredFlags.filter(f => f.type === FeatureFlagType.WIDGET),
    [FeatureFlagType.FEATURE]: filteredFlags.filter(f => f.type === FeatureFlagType.FEATURE),
  };

  const handleToggleEnabled = async (flag: IFeatureFlag) => {
    try {
      console.log('Toggling feature flag:', flag.name, 'from', flag.enabled, 'to', !flag.enabled);
      await updateFeatureFlag.mutateAsync({
        id: flag._id!,
        data: { enabled: !flag.enabled }
      });
      toast.success(`${flag.displayName} ${!flag.enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Failed to update feature flag:', error);
      const errorMessage = error?.response?.data?.message || error.message;
      if (errorMessage.includes('Access denied') || errorMessage.includes('Cannot update')) {
        toast.error(`Permission denied: Only super admins can modify feature flags`);
      } else {
        toast.error(`Failed to update ${flag.displayName}: ${errorMessage}`);
      }
    }
  };

  const handleEditFlag = (flag: IFeatureFlag) => {
    setEditingFlag(flag);
    setEditFormData({
      displayName: flag.displayName,
      description: flag.description || "",
      enabled: flag.enabled,
      allowedRoles: [...flag.allowedRoles]
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFlag) return;

    try {
      await updateFeatureFlag.mutateAsync({
        id: editingFlag._id!,
        data: editFormData
      });
      toast.success(`${editFormData.displayName} updated successfully`);
      setIsEditDialogOpen(false);
      setEditingFlag(null);
    } catch (error: any) {
      console.error('Failed to update feature flag:', error);
      const errorMessage = error?.response?.data?.message || error.message;
      if (errorMessage.includes('Access denied') || errorMessage.includes('Cannot update')) {
        toast.error(`Permission denied: Only super admins can modify feature flags`);
      } else {
        toast.error(`Failed to update ${editFormData.displayName}: ${errorMessage}`);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingFlag(null);
    setEditFormData({
      displayName: "",
      description: "",
      enabled: true,
      allowedRoles: []
    });
  };

  const handleRoleToggle = (role: UserRoleName, checked: boolean) => {
    setEditFormData(prev => ({
      ...prev,
      allowedRoles: checked
        ? [...prev.allowedRoles, role]
        : prev.allowedRoles.filter(r => r !== role)
    }));
  };

  const handleDeleteFlag = async (flag: IFeatureFlag) => {
    if (!confirm(`Are you sure you want to delete "${flag.displayName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting feature flag:', flag.name);
      await deleteFeatureFlag.mutateAsync(flag._id!);
      toast.success(`${flag.displayName} deleted successfully`);
    } catch (error: any) {
      console.error('Failed to delete feature flag:', error);
      const errorMessage = error?.response?.data?.message || error.message;
      if (errorMessage.includes('Access denied') || errorMessage.includes('Cannot delete')) {
        toast.error(`Permission denied: Only super admins can delete feature flags`);
      } else {
        toast.error(`Failed to delete ${flag.displayName}: ${errorMessage}`);
      }
    }
  };

  const getTypeIcon = (type: FeatureFlagType) => {
    switch (type) {
      case FeatureFlagType.MENU_ITEM:
        return <Menu className='h-4 w-4' />;
      case FeatureFlagType.WIDGET:
        return <Puzzle className='h-4 w-4' />;
      case FeatureFlagType.FEATURE:
        return <Star className='h-4 w-4' />;
      default:
        return <Settings className='h-4 w-4' />;
    }
  };

  const getTypeColor = (type: FeatureFlagType) => {
    switch (type) {
      case FeatureFlagType.MENU_ITEM:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case FeatureFlagType.WIDGET:
        return "bg-green-100 text-green-800 border-green-200";
      case FeatureFlagType.FEATURE:
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleColor = (role: UserRoleName) => {
    switch (role) {
      case UserRoleName.SUPER_ADMIN:
        return "bg-red-100 text-red-800 border-red-200";
      case UserRoleName.RESOURCE_MANAGER:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case UserRoleName.DISPLAY_MANAGER:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case UserRoleName.VIEWER:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Frame loggedIn={true} title='Feature Flags'>
        <div className='grid gap-4'>
          {[1, 2, 3].map(i => (
            <Card key={i} className='animate-pulse'>
              <CardHeader>
                <div className='h-4 bg-muted rounded w-1/3'></div>
                <div className='h-3 bg-muted rounded w-2/3'></div>
              </CardHeader>
              <CardContent>
                <div className='h-8 bg-muted rounded'></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame loggedIn={true} title='Feature Flags'>
        <Card className='border-destructive'>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-4'>
              <AlertTriangle className='h-5 w-5 text-destructive' />
              <p className='text-destructive'>Failed to load feature flags. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </Frame>
    );
  }

  return (
    <Frame loggedIn={true} title='Feature Flags'>
      <div className='flex items-center justify-between mb-6'>
        <Button>
          <Plus className='h-4 w-4 mr-2' />
          Add Feature Flag
        </Button>
      </div>

      <Tabs value={selectedType} onValueChange={(value: string) => setSelectedType(value as FeatureFlagType | "all")}>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='all'>All ({featureFlags?.length || 0})</TabsTrigger>
          <TabsTrigger value={FeatureFlagType.MENU_ITEM}>
            Menu Items ({flagsByType[FeatureFlagType.MENU_ITEM].length})
          </TabsTrigger>
          <TabsTrigger value={FeatureFlagType.WIDGET}>
            Widgets ({flagsByType[FeatureFlagType.WIDGET].length})
          </TabsTrigger>
          <TabsTrigger value={FeatureFlagType.FEATURE}>
            Features ({flagsByType[FeatureFlagType.FEATURE].length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className='mt-6'>
          <div className='grid gap-4'>
            {filteredFlags.map((flag) => (
              <Card key={flag._id} className={cn(
                "transition-all duration-200",
                !flag.enabled && "opacity-60"
              )}>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className={cn(
                        "p-2 rounded-lg border",
                        getTypeColor(flag.type)
                      )}>
                        {getTypeIcon(flag.type)}
                      </div>
                      <div>
                        <CardTitle className='text-lg'>{flag.displayName}</CardTitle>
                        <CardDescription className='text-sm'>
                          {flag.description || "No description provided"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggleEnabled(flag)}
                        disabled={updateFeatureFlag.isPending}
                        title={`Toggle ${flag.displayName} ${flag.enabled ? 'off' : 'on'}`}
                      />
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleEditFlag(flag)}
                        title={`Edit ${flag.displayName}`}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDeleteFlag(flag)}
                        disabled={deleteFeatureFlag.isPending}
                        title={`Delete ${flag.displayName}`}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <Badge variant='outline' className={getTypeColor(flag.type)}>
                        {flag.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant={flag.enabled ? "default" : "secondary"}>
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className='flex items-center gap-4'>
                      <Users className='h-4 w-4 text-muted-foreground' />
                      <div className='flex gap-1'>
                        {flag.allowedRoles.map((role) => (
                          <Badge
                            key={role}
                            variant='outline'
                            className={cn("text-xs", getRoleColor(role))}
                          >
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Feature Flag Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className='sm:max-w-[600px] max-w-[95vw] w-full max-h-[90vh] overflow-y-auto bg-background border border-border shadow-lg'>
          <DialogHeader>
            <DialogTitle>Edit Feature Flag</DialogTitle>
            <DialogDescription>
              Modify the feature flag settings. Only super admins can make changes.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='displayName'>Display Name</Label>
              <Input
                id='displayName'
                value={editFormData.displayName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder='Enter display name'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder='Enter description (optional)'
                rows={3}
              />
            </div>

            <div className='flex items-center space-x-2'>
              <Switch
                id='enabled'
                checked={editFormData.enabled}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor='enabled'>Enabled</Label>
            </div>

            <div className='grid gap-2'>
              <Label>Allowed Roles</Label>
              <div className='grid grid-cols-2 gap-2'>
                {Object.values(UserRoleName).map((role) => (
                  <div key={role} className='flex items-center space-x-2'>
                    <Checkbox
                      id={role}
                      checked={editFormData.allowedRoles.includes(role)}
                      onCheckedChange={(checked) => handleRoleToggle(role, checked as boolean)}
                    />
                    <Label htmlFor={role} className='text-sm'>
                      {role.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={handleCancelEdit}>
              <X className='h-4 w-4 mr-2' />
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateFeatureFlag.isPending || !editFormData.displayName.trim()}
            >
              <Save className='h-4 w-4 mr-2' />
              {updateFeatureFlag.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Frame>
  );
};

export default FeatureFlagsPage;
