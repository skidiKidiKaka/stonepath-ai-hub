import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, English"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Assignment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};