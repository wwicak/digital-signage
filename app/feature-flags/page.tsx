"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Menu, 
  Puzzle, 
  Star, 
  Plus,
  Edit,
  Trash2,
  Users,
  Shield,
  AlertTriangle
} from "lucide-react";
import { 
  useFeatureFlags, 
  useUpdateFeatureFlag, 
  useDeleteFeatureFlag 
} from "@/hooks/useFeatureFlags";
import {
  IFeatureFlag,
  FeatureFlagType,
  FeatureFlagName
} from "@/lib/types/feature-flags";
import { UserRoleName } from "@/lib/models/User";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FeatureFlagsPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<FeatureFlagType | "all">("all");
  
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
      await updateFeatureFlag.mutateAsync({
        id: flag._id!,
        data: { enabled: !flag.enabled }
      });
      toast.success(`${flag.displayName} ${!flag.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error(`Failed to update ${flag.displayName}`);
    }
  };

  const handleDeleteFlag = async (flag: IFeatureFlag) => {
    if (!confirm(`Are you sure you want to delete "${flag.displayName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteFeatureFlag.mutateAsync(flag._id!);
      toast.success(`${flag.displayName} deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${flag.displayName}`);
    }
  };

  const getTypeIcon = (type: FeatureFlagType) => {
    switch (type) {
      case FeatureFlagType.MENU_ITEM:
        return <Menu className="h-4 w-4" />;
      case FeatureFlagType.WIDGET:
        return <Puzzle className="h-4 w-4" />;
      case FeatureFlagType.FEATURE:
        return <Star className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
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
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Feature Flags</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold">Feature Flags</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load feature flags. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Feature Flags</h1>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature Flag
        </Button>
      </div>

      <Tabs value={selectedType} onValueChange={(value: string) => setSelectedType(value as FeatureFlagType | "all")}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({featureFlags?.length || 0})</TabsTrigger>
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

        <TabsContent value={selectedType} className="mt-6">
          <div className="grid gap-4">
            {filteredFlags.map((flag) => (
              <Card key={flag._id} className={cn(
                "transition-all duration-200",
                !flag.enabled && "opacity-60"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg border",
                        getTypeColor(flag.type)
                      )}>
                        {getTypeIcon(flag.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{flag.displayName}</CardTitle>
                        <CardDescription className="text-sm">
                          {flag.description || "No description provided"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggleEnabled(flag)}
                        disabled={updateFeatureFlag.isPending}
                      />
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteFlag(flag)}
                        disabled={deleteFeatureFlag.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTypeColor(flag.type)}>
                        {flag.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant={flag.enabled ? "default" : "secondary"}>
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex gap-1">
                        {flag.allowedRoles.map((role) => (
                          <Badge 
                            key={role} 
                            variant="outline" 
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
    </div>
  );
};

export default FeatureFlagsPage;
