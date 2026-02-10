import { useState, useEffect, useCallback, useRef } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { Plus, Clock, Users, Trash2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface When2MeetProps {
  groupId: string;
}

interface Poll {
  id: string;
  title: string;
  poll_dates: string[];
  earliest_hour: number;
  latest_hour: number;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

interface SlotData {
  user_id: string;
  slot_date: string;
  slot_hour: number;
  full_name?: string;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

const formatHour = (h: number) => {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
};

export const When2Meet = ({ groupId }: When2MeetProps) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Create form state
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [earliestHour, setEarliestHour] = useState(9);
  const [latestHour, setLatestHour] = useState(17);
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(startOfWeek(new Date()));

  useEffect(() => {
    fetchPolls();
    getUser();
  }, [groupId]);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchPolls = async () => {
    const { data, error } = await supabase
      .from("availability_polls" as any)
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const polls = data as any as Poll[];
      // Fetch creator names
      const creatorIds = [...new Set(polls.map((p) => p.created_by))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);
        const profileMap = new Map<string, string>();
        (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || "Unknown"));
        polls.forEach((p) => { p.creator_name = profileMap.get(p.created_by) || "Unknown"; });
      }
      setPolls(polls);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    if (selectedDates.size === 0) {
      toast({ title: "Select at least one date", variant: "destructive" });
      return;
    }
    if (earliestHour >= latestHour) {
      toast({ title: "Earliest must be before latest hour", variant: "destructive" });
      return;
    }

    const sortedDates = [...selectedDates].sort();

    const autoTitle = `${format(new Date(sortedDates[0] + "T00:00"), "MMM d")} – ${format(new Date(sortedDates[sortedDates.length - 1] + "T00:00"), "MMM d")}`;

    const { error } = await supabase.from("availability_polls" as any).insert({
      group_id: groupId,
      title: autoTitle,
      poll_dates: sortedDates,
      earliest_hour: earliestHour,
      latest_hour: latestHour,
      created_by: currentUserId,
    });

    if (error) {
      toast({ title: "Error creating poll", variant: "destructive" });
      return;
    }

    toast({ title: "Poll created!" });
    setSelectedDates(new Set());
    setEarliestHour(9);
    setLatestHour(17);
    setCreateOpen(false);
    fetchPolls();
  };

  const handleDeletePoll = async (pollId: string) => {
    const { error } = await supabase
      .from("availability_polls" as any)
      .delete()
      .eq("id", pollId);

    if (!error) {
      toast({ title: "Poll deleted" });
      if (selectedPoll?.id === pollId) setSelectedPoll(null);
      fetchPolls();
    }
  };

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  // Mini calendar for date picking
  const calendarDays = Array.from({ length: 28 }, (_, i) => addDays(calendarWeekStart, i));

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> New Poll
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Availability Poll</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePoll} className="space-y-4">

                <div className="space-y-2">
                  <Label>Click dates to select ({selectedDates.size} selected)</Label>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCalendarWeekStart(addDays(calendarWeekStart, -7))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        {format(calendarWeekStart, "MMM yyyy")}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCalendarWeekStart(addDays(calendarWeekStart, 7))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                        <div key={d} className="text-xs font-medium text-muted-foreground p-1">
                          {d}
                        </div>
                      ))}
                      {calendarDays.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const isSelected = selectedDates.has(dateStr);
                        const isPast = day < new Date(new Date().toDateString());
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={isPast}
                            onClick={() => toggleDate(dateStr)}
                            className={`text-xs p-1.5 rounded-md transition-colors ${
                              isPast
                                ? "text-muted-foreground/40 cursor-not-allowed"
                                : isSelected
                                ? "bg-primary text-primary-foreground font-medium"
                                : "hover:bg-muted"
                            }`}
                          >
                            {format(day, "d")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>No earlier than</Label>
                    <Select
                      value={String(earliestHour)}
                      onValueChange={(v) => setEarliestHour(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOUR_OPTIONS.filter((h) => h < latestHour).map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {formatHour(h)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>No later than</Label>
                    <Select
                      value={String(latestHour)}
                      onValueChange={(v) => setLatestHour(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOUR_OPTIONS.filter((h) => h > earliestHour).map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {formatHour(h)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Create Poll
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Create scheduling polls to find when everyone is free
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible">
        {!selectedPoll ? (
          <div className="space-y-2">
            {polls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No polls yet. Create one to find the best time!
              </p>
            ) : (
              polls.map((poll) => (
                <div
                  key={poll.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedPoll(poll)}
                >
                  <div>
                    <p className="font-medium text-sm">{poll.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {poll.poll_dates.length} dates · {formatHour(poll.earliest_hour)} – {formatHour(poll.latest_hour)} · by {poll.creator_name || "Unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUserId === poll.created_by && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePoll(poll.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2"
              onClick={() => setSelectedPoll(null)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to polls
            </Button>
            <AvailabilityGrid poll={selectedPoll} currentUserId={currentUserId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Interactive Availability Grid ───────────────────────────────────────

interface AvailabilityGridProps {
  poll: Poll;
  currentUserId: string | null;
}

const AvailabilityGrid = ({ poll, currentUserId }: AvailabilityGridProps) => {
  const [mySlots, setMySlots] = useState<Set<string>>(new Set());
  const [allSlots, setAllSlots] = useState<SlotData[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const { toast } = useToast();

  const hours = Array.from(
    { length: poll.latest_hour - poll.earliest_hour },
    (_, i) => poll.earliest_hour + i
  );

  const slotKey = (date: string, hour: number) => `${date}:${hour}`;

  const fetchData = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("availability_responses" as any)
      .select("user_id, slot_date, slot_hour")
      .eq("poll_id", poll.id);

    if (error) {
      console.error("Failed to load responses:", error);
      return;
    }

    const slots = (data || []) as any[];

    // Fetch profiles
    const uniqueUserIds = [...new Set(slots.map((s) => s.user_id))];
    const profileMap = new Map<string, string>();
    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", uniqueUserIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || "User"));
    }

    setAllSlots(
      slots.map((s) => ({
        user_id: s.user_id,
        slot_date: s.slot_date,
        slot_hour: s.slot_hour,
        full_name: profileMap.get(s.user_id) || "User",
      }))
    );

    const mine = new Set<string>();
    slots.forEach((s) => {
      if (s.user_id === currentUserId) {
        mine.add(slotKey(s.slot_date, s.slot_hour));
      }
    });
    setMySlots(mine);
    setMemberCount(new Set(slots.map((s: any) => s.user_id)).size);
  }, [poll.id, currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSlot = async (date: string, hour: number) => {
    if (!currentUserId) return;
    const key = slotKey(date, hour);
    const isSelected = mySlots.has(key);

    if (isSelected) {
      const { error } = await supabase
        .from("availability_responses" as any)
        .delete()
        .eq("poll_id", poll.id)
        .eq("user_id", currentUserId)
        .eq("slot_date", date)
        .eq("slot_hour", hour);

      if (!error) {
        setMySlots((prev) => { const n = new Set(prev); n.delete(key); return n; });
        setAllSlots((prev) =>
          prev.filter((s) => !(s.user_id === currentUserId && s.slot_date === date && s.slot_hour === hour))
        );
      }
    } else {
      const { error } = await supabase.from("availability_responses" as any).insert({
        poll_id: poll.id,
        user_id: currentUserId,
        slot_date: date,
        slot_hour: hour,
      });

      if (!error) {
        setMySlots((prev) => new Set(prev).add(key));
        setAllSlots((prev) => [
          ...prev,
          { slot_date: date, slot_hour: hour, user_id: currentUserId, full_name: "You" },
        ]);
      }
    }
  };

  const handleDragSlot = async (date: string, hour: number) => {
    const key = slotKey(date, hour);
    const isSelected = mySlots.has(key);
    if (dragMode === "add" && !isSelected) await toggleSlot(date, hour);
    else if (dragMode === "remove" && isSelected) await toggleSlot(date, hour);
  };

  const handleMouseDown = (date: string, hour: number) => {
    const key = slotKey(date, hour);
    setIsDragging(true);
    setDragMode(mySlots.has(key) ? "remove" : "add");
    toggleSlot(date, hour);
  };

  const handleMouseEnter = (date: string, hour: number) => {
    if (isDragging) handleDragSlot(date, hour);
  };

  useEffect(() => {
    const up = () => setIsDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const getSlotCount = (date: string, hour: number) =>
    allSlots.filter((s) => s.slot_date === date && s.slot_hour === hour).length;

  const maxCount = Math.max(
    1,
    ...poll.poll_dates.flatMap((d) => hours.map((h) => getSlotCount(d, h)))
  );

  const getSlotUsers = (date: string, hour: number) =>
    allSlots
      .filter((s) => s.slot_date === date && s.slot_hour === hour)
      .map((s) => (s.user_id === currentUserId ? "You" : s.full_name || "User"));

  return (
    <div>
      <p className="text-sm font-medium mb-1">{poll.title}</p>
      <p className="text-xs text-muted-foreground mb-4">
        {memberCount} {memberCount === 1 ? "person" : "people"} responded · Click & drag to mark your availability
      </p>

      <Tabs defaultValue="my">
        <TabsList className="mb-4">
          <TabsTrigger value="my">My Availability</TabsTrigger>
          <TabsTrigger value="group">
            <Users className="w-3 h-3 mr-1" /> Group View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my">
          <div className="overflow-x-auto select-none">
            <div
              className="grid"
              style={{ gridTemplateColumns: `56px repeat(${poll.poll_dates.length}, minmax(64px, 1fr))` }}
            >
              {/* Header */}
              <div />
              {poll.poll_dates.map((d) => (
                <div key={d} className="text-center text-xs font-medium p-1">
                  <div>{format(new Date(d + "T00:00"), "EEE")}</div>
                  <div className="text-muted-foreground">{format(new Date(d + "T00:00"), "MMM d")}</div>
                </div>
              ))}

              {/* Rows */}
              {hours.map((hour) => (
                <>
                  <div
                    key={`l-${hour}`}
                    className="text-xs text-muted-foreground flex items-center justify-end pr-2"
                  >
                    {formatHour(hour)}
                  </div>
                  {poll.poll_dates.map((d) => {
                    const key = slotKey(d, hour);
                    const isSelected = mySlots.has(key);
                    return (
                      <div
                        key={key}
                        onMouseDown={() => handleMouseDown(d, hour)}
                        onMouseEnter={() => handleMouseEnter(d, hour)}
                        className={`border border-border/50 m-0.5 rounded-sm h-7 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary hover:bg-primary/80"
                            : "bg-muted/30 hover:bg-muted"
                        }`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-sm bg-primary" />
              Available
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-sm bg-muted/30 border border-border/50" />
              Unavailable
            </div>
          </div>
        </TabsContent>

        <TabsContent value="group" className="overflow-visible">
          <div className="select-none overflow-visible">
            <div
              className="grid"
              style={{ gridTemplateColumns: `56px repeat(${poll.poll_dates.length}, minmax(64px, 1fr))` }}
            >
              {/* Header */}
              <div />
              {poll.poll_dates.map((d) => (
                <div key={d} className="text-center text-xs font-medium p-1">
                  <div>{format(new Date(d + "T00:00"), "EEE")}</div>
                  <div className="text-muted-foreground">{format(new Date(d + "T00:00"), "MMM d")}</div>
                </div>
              ))}

              {/* Rows */}
              {hours.map((hour) => (
                <>
                  <div
                    key={`gl-${hour}`}
                    className="text-xs text-muted-foreground flex items-center justify-end pr-2"
                  >
                    {formatHour(hour)}
                  </div>
                  {poll.poll_dates.map((d) => {
                    const count = getSlotCount(d, hour);
                    const users = getSlotUsers(d, hour);
                    const intensity = count / maxCount;
                    return (
                      <div
                        key={`g-${d}-${hour}`}
                        className="border border-border/50 m-0.5 rounded-sm h-7 relative group cursor-default"
                        style={{
                          backgroundColor:
                            count > 0
                              ? `hsl(var(--primary) / ${0.2 + intensity * 0.7})`
                              : undefined,
                        }}
                      >
                        {count > 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
                            {count}
                          </span>
                        )}
                        {users.length > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-[100] bg-popover border rounded-md p-2 shadow-md text-xs min-w-[120px]">
                            <p className="font-medium mb-1">{formatHour(hour)}</p>
                            {users.map((u, i) => (
                              <p key={i} className="text-muted-foreground">{u}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Fewer</span>
            <div className="flex gap-0.5">
              {[0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                <div
                  key={intensity}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: `hsl(var(--primary) / ${0.2 + intensity * 0.7})` }}
                />
              ))}
            </div>
            <span>More</span>
          </div>

          {/* Respondents summary */}
          <div className="mt-4 border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">
                {memberCount} {memberCount === 1 ? "person" : "people"} responded
              </p>
            </div>
            {(() => {
              const uniqueNames = [...new Map(
                allSlots.map((s) => [
                  s.user_id,
                  s.user_id === currentUserId ? "You" : s.full_name || "User",
                ])
              ).entries()];
              return uniqueNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {uniqueNames.map(([uid, name]) => (
                    <Badge key={uid} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No responses yet</p>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
