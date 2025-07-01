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
  Volume2
} from 'lucide-react';

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
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingVideo ? `/api/priority-videos/${editingVideo._id}` : '/api/priority-videos';
      const method = editingVideo ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token', // For testing
        },
        body: JSON.stringify(formData),
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
    });
    setEditingVideo(null);
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

  return (
    <div className="container mx-auto p-6">
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
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
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
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
                        <p className="text-sm text-gray-600">{video.url}</p>
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}