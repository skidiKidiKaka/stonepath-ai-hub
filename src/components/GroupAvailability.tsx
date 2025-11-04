import { useState, useEffect } from "react";
import { format, startOfWeek } from "date-fns";
import { Users, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GroupMember {
  user_id: string;
  profiles?: {
    full_name?: string;
  };
}

interface AvailabilityData {
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes?: string;
  profiles?: {
    full_name?: string;
  };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const GroupAvailability = ({ groupId }: { groupId?: string }) => {
  const [weekStart] = useState<Date>(startOfWeek(new Date()));
  const [groupAvailability, setGroupAvailability] = useState<AvailabilityData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (groupId) {
      fetchGroupAvailability();
    }
  }, [groupId, weekStart]);

  const fetchGroupAvailability = async () => {
    if (!groupId) return;

    // First get group members
    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select("user_id, profiles(full_name)")
      .eq("group_id", groupId);

    if (membersError) {
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive",
      });
      return;
    }

    const memberIds = (members as GroupMember[]).map((m) => m.user_id);

    // Then get their availability
    const { data: availability, error: availError } = await supabase
      .from("user_availability")
      .select("*, profiles(full_name)")
      .in("user_id", memberIds)
      .eq("week_start_date", format(weekStart, "yyyy-MM-dd"))
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (availError) {
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
      return;
    }

    setGroupAvailability(availability as AvailabilityData[] || []);
  };

  // Group availability by day
  const availabilityByDay = DAYS.map((_, dayIndex) => ({
    day: DAYS[dayIndex],
    slots: groupAvailability.filter((a) => a.day_of_week === dayIndex),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          <CardTitle>Group Availability</CardTitle>
        </div>
        <CardDescription>
          Week of {format(weekStart, "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availabilityByDay.map(({ day, slots }) => (
            <div key={day} className="space-y-2">
              <h4 className="font-medium text-sm">{day}</h4>
              {slots.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-4">No availability shared</p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {slot.profiles?.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {slot.profiles?.full_name || "User"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        {slot.notes && (
                          <p className="text-xs text-muted-foreground truncate">{slot.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
