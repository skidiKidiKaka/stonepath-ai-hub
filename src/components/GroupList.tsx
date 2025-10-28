import { useState } from "react";
import { Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Group {
  id: string;
  name: string;
  description: string | null;
  category: string;
  created_by: string;
  member_count?: number;
}

interface GroupListProps {
  groups: Group[];
  onGroupSelect: (groupId: string) => void;
  onRefresh: () => void;
}

export const GroupList = ({ groups, onGroupSelect, onRefresh }: GroupListProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"study" | "hobby" | "other">("study");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast({
        title: "Missing Information",
        description: "Please enter a group name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create groups",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name,
        description,
        category,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
      });

    setIsSubmitting(false);

    if (memberError) {
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Group created successfully",
    });

    setName("");
    setDescription("");
    setCategory("study");
    setOpen(false);
    onRefresh();
  };

  const handleJoinGroup = async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Joined group successfully",
    });

    onRefresh();
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryColors = {
    study: "default",
    hobby: "secondary",
    other: "outline",
  } as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            <CardTitle>Groups</CardTitle>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name *</Label>
                  <Input
                    id="group-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={(value: "study" | "hobby" | "other") => setCategory(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">Study</SelectItem>
                      <SelectItem value="hobby">Hobby</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your group"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Group"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No groups found
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onGroupSelect(group.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{group.name}</h4>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={categoryColors[group.category as keyof typeof categoryColors]}>
                    {group.category}
                  </Badge>
                </div>
                {group.member_count !== undefined && (
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {group.member_count} members
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};