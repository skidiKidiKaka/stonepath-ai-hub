import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AssignmentFormProps {
  onAssignmentAdded: () => void;
}

export const AssignmentForm = ({ onAssignmentAdded }: AssignmentFormProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getTodayDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !dueDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and due date",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add assignments",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("assignments").insert({
      user_id: user.id,
      title,
      description,
      due_date: new Date(dueDate).toISOString(),
      subject,
      priority,
      status: "pending",
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add assignment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Assignment added successfully",
    });

    setTitle("");
    setDescription("");
    setDueDate("");
    setSubject("");
    setPriority("medium");
    setOpen(false);
    onAssignmentAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(capitalizeFirstLetter(e.target.value))}
              placeholder="Assignment title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(capitalizeFirstLetter(e.target.value))}
              placeholder="e.g., Mathematics, English"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(capitalizeFirstLetter(e.target.value))}
              placeholder="Assignment details"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date *</Label>
            <Input
              id="due-date"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={getTodayDateTime()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setPriority("low")}
                className={cn(
                  "flex-1",
                  priority === "low" 
                    ? "bg-green-500 hover:bg-green-600 text-white" 
                    : "bg-green-100 hover:bg-green-200 text-green-700"
                )}
              >
                Low
              </Button>
              <Button
                type="button"
                onClick={() => setPriority("medium")}
                className={cn(
                  "flex-1",
                  priority === "medium" 
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                    : "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                )}
              >
                Medium
              </Button>
              <Button
                type="button"
                onClick={() => setPriority("high")}
                className={cn(
                  "flex-1",
                  priority === "high" 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-red-100 hover:bg-red-200 text-red-700"
                )}
              >
                High
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Assignment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};