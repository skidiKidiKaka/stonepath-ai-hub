import { useState, useEffect } from "react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Search, Clock, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FriendOption {
  user_id: string;
  full_name: string;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes?: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const FriendAvailabilityLookup = () => {
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendOption | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (selectedFriend) {
      fetchFriendAvailability(selectedFriend.user_id);
    }
  }, [selectedFriend, weekStart]);

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all group members who share a group with the current user
    const { data: myGroups } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (!myGroups?.length) return;

    const groupIds = myGroups.map((g: any) => g.group_id);

    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .in("group_id", groupIds)
      .neq("user_id", user.id);

    if (!members) return;

    // Deduplicate by user_id
    const uniqueUserIds = [...new Set((members as any[]).map((m) => m.user_id))];

    // Fetch profiles separately
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", uniqueUserIds);

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || "Unknown User"));

    const uniqueMap = new Map<string, FriendOption>();
    uniqueUserIds.forEach((uid) => {
      uniqueMap.set(uid, {
        user_id: uid,
        full_name: profileMap.get(uid) || "Unknown User",
      });
    });

    setFriends(Array.from(uniqueMap.values()));
  };

  const fetchFriendAvailability = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_availability")
      .select("day_of_week, start_time, end_time, notes")
      .eq("user_id", userId)
      .eq("week_start_date", format(weekStart, "yyyy-MM-dd"))
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Could not load availability",
        variant: "destructive",
      });
      return;
    }

    setAvailability(data || []);
  };

  const filteredFriends = friends.filter((f) =>
    f.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const slotsByDay = DAYS.map((day, idx) => ({
    day,
    slots: availability.filter((s) => s.day_of_week === idx),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-green-500" />
          <CardTitle>Friend's Availability</CardTitle>
        </div>
        <CardDescription>
          Look up a group member's schedule for the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFriend ? (
          <>
            <Input
              placeholder="Search group members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Join a group to see members' availability.
              </p>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members match your search.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredFriends.map((f) => (
                  <button
                    key={f.user_id}
                    onClick={() => setSelectedFriend(f)}
                    className="flex items-center gap-3 w-full p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {f.full_name[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{f.full_name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedFriend(null);
                  setAvailability([]);
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs">
                    {selectedFriend.full_name[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{selectedFriend.full_name}</span>
              </div>
            </div>

            {/* Week nav */}
            <div className="flex items-center justify-between border rounded-lg p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart(subWeeks(weekStart, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">
                Week of {format(weekStart, "MMM d, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart(addWeeks(weekStart, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
            ) : availability.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No availability shared for this week.
              </p>
            ) : (
              <div className="space-y-3">
                {slotsByDay
                  .filter(({ slots }) => slots.length > 0)
                  .map(({ day, slots }) => (
                    <div key={day} className="space-y-1">
                      <h4 className="text-sm font-medium">{day}</h4>
                      {slots.map((slot, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 pl-4 py-1 text-sm text-muted-foreground"
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            {slot.start_time} – {slot.end_time}
                          </span>
                          {slot.notes && (
                            <span className="text-xs truncate">· {slot.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
