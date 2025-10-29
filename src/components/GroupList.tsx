import { useState, useEffect } from "react";
import { Plus, Users, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Group {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_public: boolean;
  created_by: string;
  member_count?: number;
}

interface GroupListProps {
  onGroupSelect: (groupId: string) => void;
}

export const GroupList = ({ onGroupSelect }: GroupListProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("study");
  const [isPublic, setIsPublic] = useState(true);
  const { toast } = useToast();

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const fetchGroups = async () => {
    const { data: groupsData, error: groupsError } = await supabase
      .from("groups" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (groupsError) {
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
      return;
    }

    const groupsWithCounts = await Promise.all(
      (groupsData || []).map(async (group: any) => {
        const { count } = await supabase
          .from("group_members" as any)
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        return { ...group, member_count: count || 0 };
      })
    );

    setGroups(groupsWithCounts as Group[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a group",
        variant: "destructive",
      });
      return;
    }

    const { data: newGroup, error: groupError } = await supabase
      .from("groups" as any)
      .insert({
        name,
        description,
        category,
        is_public: isPublic,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError || !newGroup) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
      return;
    }

    const { error: memberError } = await supabase.from("group_members" as any).insert({
      group_id: (newGroup as any).id,
      user_id: user.id,
      role: "admin",
    });

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
    setIsPublic(true);
    setOpen(false);
    fetchGroups();
  };

  const handleJoinGroup = async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a group",
        variant: "destructive",
      });
      return;
    }

    const { data: existingMember } = await supabase
      .from("group_members" as any)
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      onGroupSelect(groupId);
      return;
    }

    const { error } = await supabase.from("group_members" as any).insert({
      group_id: groupId,
      user_id: user.id,
      role: "member",
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

    fetchGroups();
    onGroupSelect(groupId);
  };

  if (loading) {
    return <div className="text-center py-8">Loading groups...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Groups</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(capitalizeFirstLetter(e.target.value))}
                  placeholder="Enter group name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(capitalizeFirstLetter(e.target.value))}
                  placeholder="What is this group about?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="study">Study</SelectItem>
                    <SelectItem value="hobby">Hobby</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="games">Games</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="public">Public Group</Label>
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              <Button type="submit" className="w-full">
                Create Group
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-muted-foreground">
              No groups yet. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleJoinGroup(group.id)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {group.name}
                      {group.is_public ? (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{group.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{group.member_count} members</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
