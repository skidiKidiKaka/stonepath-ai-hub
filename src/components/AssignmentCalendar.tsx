import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  subject: string | null;
  priority: string;
  status: string;
  type?: string;
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

  const getUpcomingAssignments = () => {
    const now = new Date();
    return assignments
      .filter((assignment) => new Date(assignment.due_date) >= now)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);
  };

  const upcomingAssignments = getUpcomingAssignments();

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
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
                  Assignments & Exams on {selectedDate.toLocaleDateString()}
                </h3>
                {assignmentsOnSelectedDate.length > 0 ? (
                  <div className="space-y-2">
                    {assignmentsOnSelectedDate.map((assignment) => (
                      <div key={assignment.id} className={`p-2 rounded-lg text-sm ${
                        assignment.type === 'exam' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-muted'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 font-medium">
                              {assignment.type === 'exam' ? (
                                <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                              ) : (
                                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                              )}
                              {assignment.title}
                            </div>
                            {assignment.subject && (
                              <div className="text-xs text-muted-foreground ml-5">{assignment.subject}</div>
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
                  <p className="text-sm text-muted-foreground">No assignments or exams due on this date</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Upcoming Assignments & Exams</h3>
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-2">
                {upcomingAssignments.map((assignment) => (
                  <div key={assignment.id} className={`p-3 rounded-lg ${
                    assignment.type === 'exam' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-muted'
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-sm">
                          {assignment.type === 'exam' ? (
                            <GraduationCap className="h-4 w-4 text-purple-500" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-blue-500" />
                          )}
                          {assignment.title}
                        </div>
                        {assignment.subject && (
                          <div className="text-xs text-muted-foreground ml-5">{assignment.subject}</div>
                        )}
                      </div>
                      <Badge variant={priorityColors[assignment.priority as keyof typeof priorityColors]} className="text-xs">
                        {assignment.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground ml-5">
                      {assignment.type === 'exam' ? 'Exam' : 'Due'}: {new Date(assignment.due_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming assignments or exams</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};