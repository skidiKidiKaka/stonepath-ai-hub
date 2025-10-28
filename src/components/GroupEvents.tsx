import { useState, useEffect } from "react";
import { Plus, Calendar, MapPin, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  created_by: string;
  rsvp_count?: number;
  user_rsvp?: string | null;
}

interface GroupEventsProps {
  groupId: string;
  userRole: string;
}

export const GroupEvents = ({ groupId, userRole }: GroupEventsProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const getTodayDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const { data: eventsData, error } = await supabase
      .from("group_events" as any)
      .select("*")
      .eq("group_id", groupId)
      .order("event_date", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const eventsWithRsvps = await Promise.all(
      (eventsData || []).map(async (event: any) => {
        const { count } = await supabase
          .from("event_rsvps" as any)
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("status", "going");

        const { data: userRsvp } = await supabase
          .from("event_rsvps" as any)
          .select("status")
          .eq("event_id", event.id)
          .eq("user_id", user?.id || "")
          .maybeSingle();

        return {
          ...event,
          rsvp_count: count || 0,
          user_rsvp: (userRsvp as any)?.status || null,
        };
      })
    );

    setEvents(eventsWithRsvps as Event[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [groupId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create events",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("group_events" as any).insert({
      group_id: groupId,
      title,
      description,
      event_date: new Date(eventDate).toISOString(),
      location,
      created_by: user.id,
    });

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

  const handleRSVP = async (eventId: string, status: "going" | "not_going") => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to RSVP",
        variant: "destructive",
      });
      return;
    }

    const { data: existingRsvp } = await supabase
      .from("event_rsvps" as any)
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingRsvp) {
      if ((existingRsvp as any).status === status) {
        const { error } = await supabase
          .from("event_rsvps" as any)
          .delete()
          .eq("id", (existingRsvp as any).id);

        if (error) {
          toast({
            title: "Error",
            description: "Failed to update RSVP",
            variant: "destructive",
          });
          return;
        }
      } else {
        const { error } = await supabase
          .from("event_rsvps" as any)
          .update({ status })
          .eq("id", (existingRsvp as any).id);

        if (error) {
          toast({
            title: "Error",
            description: "Failed to update RSVP",
            variant: "destructive",
          });
          return;
        }
      }
    } else {
      const { error } = await supabase.from("event_rsvps" as any).insert({
        event_id: eventId,
        user_id: user.id,
        status,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to RSVP",
          variant: "destructive",
        });
        return;
      }
    }

    fetchEvents();
    toast({
      title: "Success",
      description: "RSVP updated",
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("group_events" as any)
      .delete()
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
      return;
    }

    fetchEvents();
    toast({
      title: "Success",
      description: "Event deleted",
    });
  };

  const canManageEvents = userRole === "admin" || userRole === "moderator";

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Group Events</h3>
        {canManageEvents && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Event details"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-date">Event Date & Time *</Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={getTodayDateTime()}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Event location"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Create Event
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No events scheduled yet.
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                  </div>
                  {event.user_rsvp && (
                    <Badge
                      variant={event.user_rsvp === "going" ? "default" : "secondary"}
                    >
                      {event.user_rsvp === "going" ? "Going" : "Not Going"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(event.event_date).toLocaleString()} (
                      {formatDistanceToNow(new Date(event.event_date), {
                        addSuffix: true,
                      })}
                      )
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{event.rsvp_count} going</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={event.user_rsvp === "going" ? "default" : "outline"}
                    onClick={() => handleRSVP(event.id, "going")}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Going
                  </Button>
                  <Button
                    size="sm"
                    variant={event.user_rsvp === "not_going" ? "default" : "outline"}
                    onClick={() => handleRSVP(event.id, "not_going")}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Not Going
                  </Button>
                  {(canManageEvents || event.created_by === currentUserId) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
