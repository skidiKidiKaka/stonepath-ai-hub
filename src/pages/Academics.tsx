import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AssignmentForm } from "@/components/AssignmentForm";
import { AssignmentList } from "@/components/AssignmentList";
import { AssignmentCalendar } from "@/components/AssignmentCalendar";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { AiNoteGenerator } from "@/components/AiNoteGenerator";

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

const Academics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the academic planner",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setUser(user);
    fetchAssignments();
  };

  const fetchAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } else {
      setAssignments(data || []);
    }
    setLoading(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <AssignmentForm onAssignmentAdded={fetchAssignments} />
          </div>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Academic Planner
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-8">Loading assignments...</div>
        ) : (
          <div className="space-y-6">
            <AiNoteGenerator />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <AssignmentList
                  assignments={assignments}
                  onAssignmentUpdated={fetchAssignments}
                />
                <PomodoroTimer />
              </div>
              <div>
                <AssignmentCalendar assignments={assignments} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Academics;
