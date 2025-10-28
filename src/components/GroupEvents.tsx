import { useState, useEffect } from "react";
import { Calendar, MapPin, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  created_by: string;
  rsvp_count?: {
    going: number;
    maybe: number;
    not_going: number;
  };
  user_rsvp?: string | null;
}

interface GroupEventsProps {
  groupId: string;
}

export const GroupEvents = ({ groupId }: GroupEventsProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, [groupId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: eventsData, error } = await supabase
      .from("group_events")
      .select(`
        *,
        event_rsvps (status, user_id)
      `)
      .eq("group_id", groupId)
      .order("event_date", { ascending: true });

    if (!error && eventsData) {
      const processedEvents = eventsData.map((event: any) => {
        const rsvps = event.event_rsvps || [];
        const userRsvp = rsvps.find((r: any) => r.user_id === user?.id);
        
        return {
          ...event,
          rsvp_count: {
            going: rsvps.filter((r: any) => r.status === "going").length,
            maybe: rsvps.filter((r: any) => r.status === "maybe").length,
            not_going: rsvps.filter((r: any) => r.status === "not_going").length,
          },
          user_rsvp: userRsvp?.status || null,
        };
      });

      setEvents(processedEvents);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !eventDate || !user) {
      toast({
        title: "Missing Information",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("group_events").insert({
      group_id: groupId,
      title,
      description,
      event_date: new Date(eventDate).toISOString(),
      location,
      created_by: user.id,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Event created successfully",
    });

    setTitle("");
    setDescription("");
    setEventDate("");
    setLocation("");
    setOpen(false);
    fetchEvents();
  };

  const handleRSVP = async (eventId: string, status: "going" | "maybe" | "not_going") => {
    if (!user) return;

    const { error } = await supabase
      .from("event_rsvps")
      .upsert({
        event_id: eventId,
        user_id: user.id,
        status,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update RSVP",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "RSVP updated",
    });

    fetchEvents();
  };

  const statusColors = {
    going: "default",
    maybe: "secondary",
    not_going: "outline",
  } as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <CardTitle>Events</CardTitle>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-title">Title *</Label>
                  <Input
                    id="event-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Event title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date & Time *</Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-location">Location</Label>
                  <Input
                    id="event-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Event location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Event details"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="p-4 rounded-lg border bg-card">
              <h4 className="font-medium mb-2">{event.title}</h4>
              {event.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {event.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.event_date), "PPp")}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Users className="h-3 w-3" />
                <span>{event.rsvp_count?.going || 0} going</span>
                <span>•</span>
                <span>{event.rsvp_count?.maybe || 0} maybe</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={event.user_rsvp === "going" ? "default" : "outline"}
                  onClick={() => handleRSVP(event.id, "going")}
                >
                  Going
                </Button>
                <Button
                  size="sm"
                  variant={event.user_rsvp === "maybe" ? "default" : "outline"}
                  onClick={() => handleRSVP(event.id, "maybe")}
                >
                  Maybe
                </Button>
                <Button
                  size="sm"
                  variant={event.user_rsvp === "not_going" ? "default" : "outline"}
                  onClick={() => handleRSVP(event.id, "not_going")}
                >
                  Can't Go
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};