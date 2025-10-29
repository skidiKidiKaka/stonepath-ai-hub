import { useState, useEffect } from "react";
import { Plus, Users, Lock, Globe, BookOpen, Palette, Trophy, Gamepad2, PartyPopper, MoreHorizontal, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getCategoryIcon = (category: string) => {
    const iconProps = { className: "h-8 w-8" };
    switch (category) {
      case "study":
        return <BookOpen {...iconProps} />;
      case "hobby":
        return <Palette {...iconProps} />;
      case "sports":
        return <Trophy {...iconProps} />;
      case "games":
        return <Gamepad2 {...iconProps} />;
      case "social":
        return <PartyPopper {...iconProps} />;
      default:
        return <Users {...iconProps} />;
    }
  };

  const fetchGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

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

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;

    const { error } = await supabase
      .from("groups" as any)
      .delete()
      .eq("id", selectedGroupId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Group deleted successfully",
    });

    setDeleteDialogOpen(false);
    setSelectedGroupId(null);
    fetchGroups();
  };

  const handleShareGroup = async (groupId: string, groupName: string) => {
    const shareUrl = `${window.location.origin}/friendships?group=${groupId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: groupName,
          text: `Join my group: ${groupName}`,
          url: shareUrl,
        });
        toast({
          title: "Shared",
          description: "Group link shared successfully",
        });
      } catch (error: any) {
        // Only show error if it's not a user cancellation
        if (error.name !== 'AbortError') {
          // Fallback to clipboard
          try {
            await navigator.clipboard.writeText(shareUrl);
            toast({
              title: "Link Copied",
              description: "Group link copied to clipboard",
            });
          } catch (clipboardError) {
            toast({
              title: "Error",
              description: "Failed to share or copy link",
              variant: "destructive",
            });
          }
        }
      }
    } else {
      // Browser doesn't support share API, use clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied",
          description: "Group link copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link to clipboard",
          variant: "destructive",
        });
      }
    }
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
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div 
                    className="flex items-start gap-3 flex-1 cursor-pointer" 
                    onClick={() => handleJoinGroup(group.id)}
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {getCategoryIcon(group.category)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {group.name}
                        {group.is_public ? (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription>{group.description}</CardDescription>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="secondary">{group.category}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{group.member_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleShareGroup(group.id, group.name);
                      }}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Group
                      </DropdownMenuItem>
                      {currentUserId === group.created_by && (
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroupId(group.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be undone and all group data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
