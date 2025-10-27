import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const TaskPlanner = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    // Check if user is logged in with Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      
      // Load tasks from localStorage
      const savedTasks = localStorage.getItem("tasks");
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    // Save tasks to localStorage whenever they change
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) {
      toast.error("Please enter a task");
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      text: newTask,
      completed: false,
    };

    setTasks([...tasks, task]);
    setNewTask("");
    toast.success("Task added!");
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
    toast.success("Task deleted");
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/5 to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Task Planner
            </h1>
            <p className="text-muted-foreground mt-1">Stay organized and track your progress</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Card */}
        <Card className="mb-6 p-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
              <p className="text-3xl font-bold">{completedCount} / {tasks.length}</p>
            </div>
            {tasks.length > 0 && (
              <div className="text-right">
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {Math.round((completedCount / tasks.length) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            )}
          </div>
        </Card>

        {/* Add Task Form */}
        <Card className="mb-6 p-6">
          <form onSubmit={handleAddTask} className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </form>
        </Card>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-2">No tasks yet</p>
              <p className="text-sm text-muted-foreground">Add your first task to get started!</p>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggleTask(task.id)}
                    id={`task-${task.id}`}
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className={`flex-1 cursor-pointer ${
                      task.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {task.text}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTask(task.id)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default TaskPlanner;
