'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Calendar,
  Video,
  Music,
  Eye,
  AlertCircle,
  Play,
  Volume2,
  Upload,
  Link,
  X
} from 'lucide-react';
import Frame from '@/components/Admin/Frame';
import { useDisplays } from '@/hooks/useDisplays';
import { useBuildings } from '@/hooks/useBuildings';

interface PriorityVideo {
  _id: string;
  title?: string;
  url: string;
  mediaType: 'video' | 'audio';
  backgroundColor: string;
  schedule: {
    daysOfWeek: number[];
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
  volume: number;
  fallbackContent: {
    message: string;
    backgroundColor: string;
  };
  priority: number;
  playOnce: boolean;
  displays?: string[];
  buildings?: string[];
  isActive: boolean;
  creation_date: string;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PriorityVideosPage() {
  const [priorityVideos, setPriorityVideos] = useState<PriorityVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<PriorityVideo | null>(null);
  
  // Get displays and buildings data
  const { data: displays = [] } = useDisplays();
  const { data: buildings = [] } = useBuildings();
  
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    mediaType: 'video' as 'video' | 'audio',
    backgroundColor: '#000000',
    schedule: {
      daysOfWeek: [] as number[],
      timeSlots: [{ startTime: '22:00', endTime: '22:05' }],
    },
    volume: 1,
    fallbackContent: {
      message: 'Priority video is not scheduled',
      backgroundColor: '#000000',
    },
    priority: 100,
    playOnce: true,
    isActive: true,
    displays: [] as string[],
    buildings: [] as string[],
    isGlobal: true,
    isUploading: false,
    uploadError: null,
  });

  // File upload state
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPriorityVideos();
  }, []);

  const fetchPriorityVideos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/priority-videos', {
        headers: {
          'Authorization': 'Bearer dummy-token', // For testing
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPriorityVideos(data.priorityVideos || []);
      }
    } catch (error) {
      console.error('Error fetching priority videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      
      // Auto-detect media type from file
      const isVideo = file.type.startsWith('video/');
      setFormData(prev => ({
        ...prev,
        mediaType: isVideo ? 'video' : 'audio'
      }));
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('mediaFile', selectedFile);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer dummy-token', // For testing
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Update form with uploaded file URL
      setFormData(prev => ({
        ...prev,
        url: result.url,
      }));
      
      setUploadMode('url'); // Switch back to URL mode after successful upload
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that we have a URL
    if (!formData.url.trim()) {
      setUploadError('Please provide a media URL or upload a file');
      return;
    }
    
    try {
      const url = editingVideo ? `/api/priority-videos/${editingVideo._id}` : '/api/priority-videos';
      const method = editingVideo ? 'PUT' : 'POST';
      
      // Prepare data for submission - remove isGlobal field and handle displays/buildings
      const { isGlobal, ...submitData } = {
        ...formData,
        // Only include displays/buildings if not global
        displays: formData.isGlobal ? undefined : formData.displays,
        buildings: formData.isGlobal ? undefined : formData.buildings,
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token', // For testing
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        await fetchPriorityVideos();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving priority video:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this priority video?')) return;
    
    try {
      const response = await fetch(`/api/priority-videos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer dummy-token', // For testing
        },
      });

      if (response.ok) {
        await fetchPriorityVideos();
      }
    } catch (error) {
      console.error('Error deleting priority video:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      mediaType: 'video',
      backgroundColor: '#000000',
      schedule: {
        daysOfWeek: [],
        timeSlots: [{ startTime: '22:00', endTime: '22:05' }],
      },
      volume: 1,
      fallbackContent: {
        message: 'Priority video is not scheduled',
        backgroundColor: '#000000',
      },
      priority: 100,
      playOnce: true,
      isActive: true,
      displays: [],
      buildings: [],
      isGlobal: true,
      isUploading: false,
      uploadError: null,
    });
    setEditingVideo(null);
    setUploadMode('url');
    setSelectedFile(null);
    setUploadError(null);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const openEditDialog = (video: PriorityVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title || '',
      url: video.url,
      mediaType: video.mediaType,
      backgroundColor: video.backgroundColor,
      schedule: video.schedule,
      volume: video.volume,
      fallbackContent: video.fallbackContent,
      priority: video.priority,
      playOnce: video.playOnce,
      isActive: video.isActive,
      displays: video.displays || [],
      buildings: video.buildings || [],
      isGlobal: !video.displays?.length && !video.buildings?.length,
      isUploading: false,
      uploadError: null,
    });
    setIsDialogOpen(true);
  };

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        timeSlots: [...prev.schedule.timeSlots, { startTime: '22:00', endTime: '22:05' }],
      },
    }));
  };

  const removeTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        timeSlots: prev.schedule.timeSlots.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        timeSlots: prev.schedule.timeSlots.map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        daysOfWeek: prev.schedule.daysOfWeek.includes(day)
          ? prev.schedule.daysOfWeek.filter(d => d !== day)
          : [...prev.schedule.daysOfWeek, day],
      },
    }));
  };

  const toggleDisplay = (displayId: string) => {
    setFormData(prev => ({
      ...prev,
      displays: prev.displays.includes(displayId)
        ? prev.displays.filter(id => id !== displayId)
        : [...prev.displays, displayId],
      isGlobal: false,
    }));
  };

  const toggleBuilding = (building: string) => {
    setFormData(prev => ({
      ...prev,
      buildings: prev.buildings.includes(building)
        ? prev.buildings.filter(b => b !== building)
        : [...prev.buildings, building],
      isGlobal: false,
    }));
  };

  const setGlobalAssignment = (isGlobal: boolean) => {
    setFormData(prev => ({
      ...prev,
      isGlobal,
      displays: isGlobal ? [] : prev.displays,
      buildings: isGlobal ? [] : prev.buildings,
    }));
  };

  return (
    <Frame loggedIn={true} title="Priority Videos">
      <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-orange-600" />
            Priority Video Scheduling
          </h1>
          <p className="text-gray-600 mt-2">
            Manage scheduled videos that take over displays at specific times
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Priority Video
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVideo ? 'Edit Priority Video' : 'Create Priority Video'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="assignment">Assignment</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title (Optional)</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="National Anthem"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="mediaType">Media Type</Label>
                      <Select 
                        value={formData.mediaType} 
                        onValueChange={(value: 'video' | 'audio') => 
                          setFormData(prev => ({ ...prev, mediaType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4" />
                              Video
                            </div>
                          </SelectItem>
                          <SelectItem value="audio">
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4" />
                              Audio
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Media Source</Label>
                      <div className="flex gap-2 mb-3">
                        <Button
                          type="button"
                          variant={uploadMode === 'url' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMode('url')}
                          className="flex items-center gap-2"
                        >
                          <Link className="w-4 h-4" />
                          URL
                        </Button>
                        <Button
                          type="button"
                          variant={uploadMode === 'upload' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMode('upload')}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </Button>
                      </div>
                    </div>

                    {uploadMode === 'url' ? (
                      <div>
                        <Label htmlFor="url">Media URL</Label>
                        <Input
                          id="url"
                          value={formData.url}
                          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="https://example.com/video.mp4 or YouTube URL"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="file-upload">Upload Media File</Label>
                          <Input
                            id="file-upload"
                            type="file"
                            accept="video/*,audio/*"
                            onChange={handleFileSelect}
                            disabled={isUploading}
                            className="cursor-pointer"
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            Supported: MP4, WebM, MOV, AVI, MP3, WAV, OGG, M4A (Max 50MB)
                          </p>
                        </div>

                        {selectedFile && (
                          <div className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{selectedFile.name}</p>
                                <p className="text-xs text-gray-600">
                                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFile(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <Button
                              type="button"
                              onClick={uploadFile}
                              disabled={isUploading}
                              className="w-full"
                            >
                              {isUploading ? 'Uploading...' : 'Upload File'}
                            </Button>
                          </div>
                        )}

                        {isUploading && (
                          <div className="space-y-2">
                            <div className="animate-pulse bg-orange-100 h-2 rounded"></div>
                            <p className="text-sm text-center">Uploading file...</p>
                          </div>
                        )}

                        {uploadError && (
                          <Alert variant="destructive">
                            <AlertDescription>{uploadError}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="volume">Volume (0.0 - 1.0)</Label>
                      <Input
                        id="volume"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.volume}
                        onChange={(e) => setFormData(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="schedule" className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Days of Week</Label>
                    <p className="text-sm text-gray-600 mb-3">Leave all unchecked to run every day</p>
                    <div className="grid grid-cols-7 gap-2">
                      {dayNames.map((day, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${index}`}
                            checked={formData.schedule.daysOfWeek.includes(index)}
                            onCheckedChange={() => toggleDay(index)}
                          />
                          <Label htmlFor={`day-${index}`} className="text-sm">
                            {day.slice(0, 3)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Time Slots</Label>
                      <Button type="button" onClick={addTimeSlot} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Slot
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.schedule.timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1">
                            <Label htmlFor={`start-${index}`} className="text-sm">Start Time</Label>
                            <Input
                              id={`start-${index}`}
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`end-${index}`} className="text-sm">End Time</Label>
                            <Input
                              id={`end-${index}`}
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeSlot(index)}
                            disabled={formData.schedule.timeSlots.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="assignment" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Assignment Scope</Label>
                      <p className="text-sm text-gray-600 mb-3">Choose how this priority video should be assigned</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isGlobal"
                            checked={formData.isGlobal}
                            onCheckedChange={(checked) => setGlobalAssignment(checked as boolean)}
                          />
                          <Label htmlFor="isGlobal" className="font-medium">
                            Apply to all displays (Global)
                          </Label>
                        </div>
                        <p className="text-sm text-gray-500 ml-6">
                          This priority video will override all displays when scheduled
                        </p>
                      </div>
                    </div>

                    {!formData.isGlobal && (
                      <>
                        <div>
                          <Label className="text-base font-semibold mb-3 block">Specific Displays</Label>
                          <p className="text-sm text-gray-600 mb-3">Select individual displays for this priority video</p>
                          
                          {displays.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                              {displays.map((display) => (
                                <div key={display._id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`display-${display._id}`}
                                    checked={formData.displays.includes(display._id)}
                                    onCheckedChange={() => toggleDisplay(display._id)}
                                  />
                                  <Label htmlFor={`display-${display._id}`} className="text-sm">
                                    {display.name || `Display ${display._id.slice(-6)}`}
                                    {display.building && (
                                      <span className="text-gray-500 ml-1">({display.building})</span>
                                    )}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No displays available</p>
                          )}
                        </div>

                        <div>
                          <Label className="text-base font-semibold mb-3 block">Buildings</Label>
                          <p className="text-sm text-gray-600 mb-3">Select buildings to apply to all displays in those buildings</p>
                          
                          {buildings.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                              {buildings.map((building) => (
                                <div key={building.name} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`building-${building._id}`}
                                    checked={formData.buildings.includes(building.name)}
                                    onCheckedChange={() => toggleBuilding(building.name)}
                                  />
                                  <Label htmlFor={`building-${building._id}`} className="text-sm">
                                    {building.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No buildings available</p>
                          )}
                        </div>

                        {formData.displays.length === 0 && formData.buildings.length === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <p className="text-sm text-yellow-800">
                                Please select at least one display or building, or enable global assignment.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority Level (1-999)</Label>
                      <Input
                        id="priority"
                        type="number"
                        min="1"
                        max="999"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      />
                      <p className="text-sm text-gray-600 mt-1">Higher numbers = higher priority</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="playOnce"
                          checked={formData.playOnce}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, playOnce: checked as boolean }))
                          }
                        />
                        <Label htmlFor="playOnce">Play only once per schedule activation</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, isActive: checked as boolean }))
                          }
                        />
                        <Label htmlFor="isActive">Enable this priority video</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="fallbackMessage">Fallback Message</Label>
                    <Textarea
                      id="fallbackMessage"
                      value={formData.fallbackContent.message}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        fallbackContent: { ...prev.fallbackContent, message: e.target.value }
                      }))}
                      placeholder="Message shown when video cannot play"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fallbackBg">Fallback Background Color</Label>
                    <Input
                      id="fallbackBg"
                      type="color"
                      value={formData.fallbackContent.backgroundColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        fallbackContent: { ...prev.fallbackContent, backgroundColor: e.target.value }
                      }))}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={isUploading}>
                  {editingVideo ? 'Update' : 'Create'} Priority Video
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {priorityVideos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Zap className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Priority Videos</h3>
                <p className="text-gray-600 mb-4">
                  Create your first priority video to schedule content that takes over displays
                </p>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Priority Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            priorityVideos.map((video) => (
              <Card key={video._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        {video.mediaType === 'video' ? (
                          <Video className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Music className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {video.title || 'Untitled Priority Video'}
                        </CardTitle>
                        <p className="text-sm text-gray-600 break-all">{video.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={video.isActive ? 'default' : 'secondary'}>
                        {video.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">Priority: {video.priority}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(video)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(video._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {video.schedule.daysOfWeek.length === 0 
                          ? 'Every day' 
                          : video.schedule.daysOfWeek.map(d => dayNames[d].slice(0, 3)).join(', ')
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {video.schedule.timeSlots.length} time slot(s)
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Volume: {(video.volume * 100).toFixed(0)}%</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {video.playOnce ? 'Play once' : 'Repeat'}
                      </span>
                    </div>
                  </div>
                  
                  {video.schedule.timeSlots.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Time Slots:</h4>
                      <div className="flex flex-wrap gap-2">
                        {video.schedule.timeSlots.map((slot, index) => (
                          <Badge key={index} variant="outline">
                            {slot.startTime} - {slot.endTime}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Assignment:</h4>
                    {!video.displays?.length && !video.buildings?.length ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Global (All Displays)
                      </Badge>
                    ) : (
                      <div className="space-y-2">
                        {video.displays && video.displays.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Specific Displays:</span>
                            <div className="flex flex-wrap gap-1">
                              {video.displays.map((displayId, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {displays.find(d => d._id === displayId)?.name || `Display ${displayId.slice(-6)}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {video.buildings && video.buildings.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Buildings:</span>
                            <div className="flex flex-wrap gap-1">
                              {video.buildings.map((building, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {building}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      </div>
    </Frame>
  );
}
