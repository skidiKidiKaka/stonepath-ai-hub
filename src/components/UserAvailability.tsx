import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes?: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const UserAvailability = () => {
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [newSlot, setNewSlot] = useState<AvailabilitySlot>({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailability();
  }, [weekStart]);

  const fetchAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_availability")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start_date", format(weekStart, "yyyy-MM-dd"))
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
      return;
    }

    setAvailabilitySlots(data || []);
  };

  const handleAddSlot = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_availability").insert({
      user_id: user.id,
      week_start_date: format(weekStart, "yyyy-MM-dd"),
      ...newSlot,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add availability",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Availability added",
    });

    setNewSlot({
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      notes: "",
    });
    fetchAvailability();
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase
      .from("user_availability")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete availability",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Availability removed",
    });
    fetchAvailability();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-500" />
          <CardTitle>My Availability</CardTitle>
        </div>
        <CardDescription>
          Share your availability for the week of {format(weekStart, "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Slots */}
        <div className="space-y-3">
          {availabilitySlots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{DAYS[slot.day_of_week]}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
                {slot.notes && <p className="text-xs text-muted-foreground mt-1">{slot.notes}</p>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => slot.id && handleDeleteSlot(slot.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add New Slot */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Availability
          </h4>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select
                value={newSlot.day_of_week.toString()}
                onValueChange={(value) =>
                  setNewSlot({ ...newSlot, day_of_week: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, start_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="E.g., Available for study sessions, coffee, etc."
                value={newSlot.notes}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <Button onClick={handleAddSlot} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Availability
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
