import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  subject: string | null;
  priority: string;
  status: string;
}

interface AssignmentCalendarProps {
  assignments: Assignment[];
}

export const AssignmentCalendar = ({ assignments }: AssignmentCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const getAssignmentsForDate = (date: Date | undefined) => {
    if (!date) return [];
    
    return assignments.filter((assignment) => {
      const assignmentDate = new Date(assignment.due_date);
      return (
        assignmentDate.getDate() === date.getDate() &&
        assignmentDate.getMonth() === date.getMonth() &&
        assignmentDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const assignmentsOnSelectedDate = getAssignmentsForDate(selectedDate);

  const getDatesWithAssignments = () => {
    return assignments.map((assignment) => new Date(assignment.due_date));
  };

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  } as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-500" />
          <CardTitle>Calendar View</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border pointer-events-auto"
            modifiers={{
              hasAssignment: getDatesWithAssignments(),
            }}
            modifiersClassNames={{
              hasAssignment: "bg-blue-500/10 font-bold",
            }}
          />
          
          {selectedDate && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Assignments on {selectedDate.toLocaleDateString()}
              </h3>
              {assignmentsOnSelectedDate.length > 0 ? (
                <div className="space-y-2">
                  {assignmentsOnSelectedDate.map((assignment) => (
                    <div key={assignment.id} className="p-2 bg-muted rounded-lg text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium">{assignment.title}</div>
                          {assignment.subject && (
                            <div className="text-xs text-muted-foreground">{assignment.subject}</div>
                          )}
                        </div>
                        <Badge variant={priorityColors[assignment.priority as keyof typeof priorityColors]} className="text-xs">
                          {assignment.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No assignments due on this date</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};