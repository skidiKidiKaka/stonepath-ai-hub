import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EventAvailabilityGridProps {
  eventId: string;
  eventDate: string;
}

interface SlotData {
  slot_date: string;
  slot_hour: number;
  user_id: string;
  full_name?: string;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM

const formatHour = (h: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
};

export const EventAvailabilityGrid = ({ eventId, eventDate }: EventAvailabilityGridProps) => {
  const [mySlots, setMySlots] = useState<Set<string>>(new Set());
  const [allSlots, setAllSlots] = useState<SlotData[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const eventDateObj = parseISO(eventDate);
  // Show 3 days: day before, event day, day after
  const dates = [addDays(eventDateObj, -1), eventDateObj, addDays(eventDateObj, 1)];

  const slotKey = (date: string, hour: number) => `${date}:${hour}`;

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const dateStrings = dates.map((d) => format(d, "yyyy-MM-dd"));

    // Fetch all availability for this event
    const { data, error } = await supabase
      .from("event_availability" as any)
      .select("slot_date, slot_hour, user_id")
      .eq("event_id", eventId)
      .in("slot_date", dateStrings);

    if (error) {
      console.error("Failed to load availability:", error);
      return;
    }

    const slots = (data || []) as any[];

    // Fetch profiles separately
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
        slot_date: s.slot_date,
        slot_hour: s.slot_hour,
        user_id: s.user_id,
        full_name: profileMap.get(s.user_id) || "User",
      }))
    );

    const mine = new Set<string>();
    slots.forEach((s) => {
      if (s.user_id === user.id) {
        mine.add(slotKey(s.slot_date, s.slot_hour));
      }
    });
    setMySlots(mine);

    // Count unique users
    const uniqueUsers = new Set(slots.map((s: any) => s.user_id));
    setMemberCount(uniqueUsers.size);
  }, [eventId, eventDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSlot = async (date: string, hour: number) => {
    if (!currentUserId) return;
    const key = slotKey(date, hour);
    const isSelected = mySlots.has(key);

    if (isSelected) {
      const { error } = await supabase
        .from("event_availability" as any)
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", currentUserId)
        .eq("slot_date", date)
        .eq("slot_hour", hour);

      if (!error) {
        setMySlots((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setAllSlots((prev) =>
          prev.filter(
            (s) => !(s.user_id === currentUserId && s.slot_date === date && s.slot_hour === hour)
          )
        );
      }
    } else {
      const { error } = await supabase.from("event_availability" as any).insert({
        event_id: eventId,
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

    if (dragMode === "add" && !isSelected) {
      await toggleSlot(date, hour);
    } else if (dragMode === "remove" && isSelected) {
      await toggleSlot(date, hour);
    }
  };

  const handleMouseDown = (date: string, hour: number) => {
    const key = slotKey(date, hour);
    setIsDragging(true);
    setDragMode(mySlots.has(key) ? "remove" : "add");
    toggleSlot(date, hour);
  };

  const handleMouseEnter = (date: string, hour: number) => {
    if (isDragging) {
      handleDragSlot(date, hour);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Get intensity for group view
  const getSlotCount = (date: string, hour: number) => {
    return allSlots.filter((s) => s.slot_date === date && s.slot_hour === hour).length;
  };

  const maxCount = Math.max(1, ...dates.flatMap((d) => HOURS.map((h) => getSlotCount(format(d, "yyyy-MM-dd"), h))));

  const getSlotUsers = (date: string, hour: number) => {
    return allSlots
      .filter((s) => s.slot_date === date && s.slot_hour === hour)
      .map((s) => (s.user_id === currentUserId ? "You" : s.full_name || "User"));
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-500" />
          <CardTitle className="text-base">When Can You Meet?</CardTitle>
        </div>
        <CardDescription>
          Click or drag to mark your available hours. {memberCount > 0 && `${memberCount} responded.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="my">
          <TabsList className="mb-4">
            <TabsTrigger value="my">My Availability</TabsTrigger>
            <TabsTrigger value="group">Group View</TabsTrigger>
          </TabsList>

          <TabsContent value="my">
            <div className="overflow-x-auto select-none">
              <div className="grid" style={{ gridTemplateColumns: `60px repeat(${dates.length}, 1fr)` }}>
                {/* Header row */}
                <div className="text-xs font-medium text-muted-foreground p-1" />
                {dates.map((d) => (
                  <div key={d.toISOString()} className="text-center text-xs font-medium p-1">
                    <div>{format(d, "EEE")}</div>
                    <div className="text-muted-foreground">{format(d, "MMM d")}</div>
                  </div>
                ))}

                {/* Time rows */}
                {HOURS.map((hour) => (
                  <>
                    <div key={`label-${hour}`} className="text-xs text-muted-foreground p-1 flex items-center justify-end pr-2">
                      {formatHour(hour)}
                    </div>
                    {dates.map((d) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const key = slotKey(dateStr, hour);
                      const isSelected = mySlots.has(key);
                      return (
                        <div
                          key={key}
                          onMouseDown={() => handleMouseDown(dateStr, hour)}
                          onMouseEnter={() => handleMouseEnter(dateStr, hour)}
                          className={`border border-border/50 m-0.5 rounded-sm h-8 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-green-500 hover:bg-green-600"
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
                <div className="w-4 h-4 rounded-sm bg-green-500" />
                Available
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-sm bg-muted/30 border border-border/50" />
                Unavailable
              </div>
            </div>
          </TabsContent>

          <TabsContent value="group">
            <div className="overflow-x-auto select-none">
              <div className="grid" style={{ gridTemplateColumns: `60px repeat(${dates.length}, 1fr)` }}>
                {/* Header row */}
                <div className="text-xs font-medium text-muted-foreground p-1" />
                {dates.map((d) => (
                  <div key={d.toISOString()} className="text-center text-xs font-medium p-1">
                    <div>{format(d, "EEE")}</div>
                    <div className="text-muted-foreground">{format(d, "MMM d")}</div>
                  </div>
                ))}

                {/* Time rows */}
                {HOURS.map((hour) => (
                  <>
                    <div key={`glabel-${hour}`} className="text-xs text-muted-foreground p-1 flex items-center justify-end pr-2">
                      {formatHour(hour)}
                    </div>
                    {dates.map((d) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const count = getSlotCount(dateStr, hour);
                      const users = getSlotUsers(dateStr, hour);
                      const intensity = count / maxCount;
                      return (
                        <div
                          key={`g-${dateStr}-${hour}`}
                          className="border border-border/50 m-0.5 rounded-sm h-8 relative group cursor-default"
                          style={{
                            backgroundColor:
                              count > 0
                                ? `hsl(142, 71%, ${70 - intensity * 40}%)`
                                : undefined,
                          }}
                        >
                          {count > 0 && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                              {count}
                            </span>
                          )}
                          {users.length > 0 && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 bg-popover border rounded-md p-2 shadow-md text-xs min-w-[120px]">
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
                    style={{ backgroundColor: `hsl(142, 71%, ${70 - intensity * 40}%)` }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
