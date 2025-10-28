import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  text: string;
  notes: string;
  date: Date | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
}

// Sortable Task Item Component
const SortableTaskItem = ({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    high: "text-red-600",
    medium: "text-yellow-600",
    low: "text-green-600",
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <button className="cursor-grab active:cursor-grabbing mt-1" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <Checkbox
          checked={task.completed}
          onCheckedChange={onToggle}
          id={`task-${task.id}`}
        />
        <div className="flex-1">
          <label
            htmlFor={`task-${task.id}`}
            className={`cursor-pointer block font-medium ${
              task.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.text}
          </label>
          {task.notes && (
            <p className={`text-sm mt-1 ${task.completed ? "text-muted-foreground" : "text-muted-foreground"}`}>
              {task.notes}
            </p>
          )}
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            {task.date && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(task.date), "MMM dd, yyyy")}
              </span>
            )}
            <span className={`font-medium ${priorityColors[task.priority]}`}>
              {task.priority.toUpperCase()}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

const TaskPlanner = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sortBy, setSortBy] = useState<"none" | "priority" | "date">("none");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>();
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");

  const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      text: newTaskTitle,
      notes: newTaskNotes,
      date: newTaskDate || null,
      priority: newTaskPriority,
      completed: false,
    };

    setTasks([...tasks, task]);
    
    // Reset form
    setNewTaskTitle("");
    setNewTaskNotes("");
    setNewTaskDate(undefined);
    setNewTaskPriority("medium");
    setIsDialogOpen(false);
    
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getSortedTasks = () => {
    if (sortBy === "none") return tasks;
    
    const sorted = [...tasks];
    if (sortBy === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else if (sortBy === "date") {
      sorted.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }
    return sorted;
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const completionPercentage = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

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
        {/* Progress Card with Circular Progress */}
        <Card className="mb-6 p-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
              <p className="text-3xl font-bold">{completedCount} / {tasks.length}</p>
            </div>
            {tasks.length > 0 && (
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercentage / 100)}`}
                    className="transition-all duration-500"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" className="text-primary" style={{ stopColor: 'hsl(var(--primary))' }} />
                      <stop offset="100%" className="text-secondary" style={{ stopColor: 'hsl(var(--secondary))' }} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {Math.round(completionPercentage)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Controls */}
        <div className="mb-6 flex gap-3 items-center flex-wrap">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTask} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="capitalize">Task Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title..."
                    value={newTaskTitle}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length === 1) {
                        setNewTaskTitle(capitalizeFirstLetter(value));
                      } else {
                        setNewTaskTitle(value);
                      }
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="capitalize">Task Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional details or notes..."
                    value={newTaskNotes}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length === 1) {
                        setNewTaskNotes(capitalizeFirstLetter(value));
                      } else {
                        setNewTaskNotes(value);
                      }
                    }}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="capitalize">Due Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newTaskDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTaskDate ? format(newTaskDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTaskDate}
                        onSelect={(date) => {
                          setNewTaskDate(date);
                          setIsCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="capitalize">Priority</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newTaskPriority === "low" ? "default" : "outline"}
                      className={cn(
                        "flex-1",
                        newTaskPriority === "low" && "bg-green-600 hover:bg-green-700 text-white"
                      )}
                      onClick={() => setNewTaskPriority("low")}
                    >
                      Low
                    </Button>
                    <Button
                      type="button"
                      variant={newTaskPriority === "medium" ? "default" : "outline"}
                      className={cn(
                        "flex-1",
                        newTaskPriority === "medium" && "bg-yellow-600 hover:bg-yellow-700 text-white"
                      )}
                      onClick={() => setNewTaskPriority("medium")}
                    >
                      Medium
                    </Button>
                    <Button
                      type="button"
                      variant={newTaskPriority === "high" ? "default" : "outline"}
                      className={cn(
                        "flex-1",
                        newTaskPriority === "high" && "bg-red-600 hover:bg-red-700 text-white"
                      )}
                      onClick={() => setNewTaskPriority("high")}
                    >
                      High
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" variant="gradient">
                  Add Task
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Label className="text-sm capitalize">Sort by:</Label>
            <Select value={sortBy} onValueChange={(value: "none" | "priority" | "date") => setSortBy(value)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-2">No tasks yet</p>
              <p className="text-sm text-muted-foreground">Add your first task to get started!</p>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={getSortedTasks().map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {getSortedTasks().map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggleTask(task.id)}
                    onDelete={() => handleDeleteTask(task.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </main>
    </div>
  );
};

export default TaskPlanner;
