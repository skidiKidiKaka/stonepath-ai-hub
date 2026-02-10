import { useState, useEffect } from "react";
import { format, startOfWeek } from "date-fns";
import { Users, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (membersError) {
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive",
      });
      return;
    }

    const memberIds = (members as any[]).map((m) => m.user_id);

    // Fetch profiles separately
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", memberIds);

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || "User"));

    const { data: availability, error: availError } = await supabase
      .from("user_availability")
      .select("*")
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

    setGroupAvailability(
      (availability || []).map((a: any) => ({
        ...a,
        profiles: { full_name: profileMap.get(a.user_id) || "User" },
      })) as AvailabilityData[]
    );
  };

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
