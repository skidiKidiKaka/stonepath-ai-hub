import { CheckCircle2, Circle, Clock, Trash2, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  subject: string | null;
  priority: string;
  status: string;
  type?: string;
}

interface AssignmentListProps {
  assignments: Assignment[];
  onAssignmentUpdated: () => void;
}

export const AssignmentList = ({ assignments, onAssignmentUpdated }: AssignmentListProps) => {
  const { toast } = useToast();

  const toggleStatus = async (assignment: Assignment) => {
    const newStatus = assignment.status === "completed" ? "pending" : "completed";
    
    const { error } = await supabase
      .from("assignments")
      .update({ status: newStatus })
      .eq("id", assignment.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Assignment marked as ${newStatus}`,
    });

    onAssignmentUpdated();
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Assignment deleted",
    });

    onAssignmentUpdated();
  };

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  } as const;

  const sortedAssignments = [...assignments].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <CardTitle>My Assignments & Exams</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {sortedAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No assignments or exams yet. Add your first one!
          </p>
        ) : (
          <div className="space-y-2">
            {sortedAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`p-3 rounded-lg border ${
                  assignment.status === "completed" ? "bg-muted/50" : "bg-card"
                } ${assignment.type === 'exam' ? 'border-purple-500/30' : 'border-blue-500/30'}`}
              >
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => toggleStatus(assignment)}
                  >
                    {assignment.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {assignment.type === 'exam' ? (
                            <GraduationCap className="h-4 w-4 text-purple-500" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-blue-500" />
                          )}
                          <h4 className={`font-medium ${
                            assignment.status === "completed" ? "line-through text-muted-foreground" : ""
                          }`}>
                            {assignment.title}
                          </h4>
                        </div>
                        {assignment.subject && (
                          <p className="text-xs text-muted-foreground ml-6">{assignment.subject}</p>
                        )}
                        {assignment.description && (
                          <p className="text-sm text-muted-foreground mt-1 ml-6">{assignment.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityColors[assignment.priority as keyof typeof priorityColors]}>
                          {assignment.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => deleteAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      {assignment.type === 'exam' ? 'Exam' : 'Due'} {formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};