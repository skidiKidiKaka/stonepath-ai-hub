import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GroupList } from "@/components/GroupList";
import { GroupChat } from "@/components/GroupChat";
import { GroupEvents } from "@/components/GroupEvents";

interface Group {
  id: string;
  name: string;
  description: string | null;
  category: string;
  created_by: string;
}

const Friendships = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access groups",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setUser(user);
    fetchGroups();
  };

  const fetchGroups = async () => {
    setLoading(true);

    const { data: allGroups } = await supabase
      .from("groups")
      .select("*")
      .eq("is_public", true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: memberData } = await supabase
        .from("group_members")
        .select("group_id, role, groups(*)")
        .eq("user_id", user.id);

      if (memberData) {
        const userGroups = memberData.map((m: any) => m.groups);
        setMyGroups(userGroups);
      }
    }

    setGroups(allGroups || []);
    setLoading(false);
  };

  const handleGroupSelect = async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      toast({
        title: "Not a Member",
        description: "Please join this group first",
        variant: "destructive",
      });
      return;
    }

    const { data: group } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (group) {
      setSelectedGroup(group);
      setSelectedGroupId(groupId);
      setUserRole(membership.role);
    }
  };

  if (!user) {
    return null;
  }

  if (selectedGroupId && selectedGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-green-500/5 to-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              {selectedGroup.name}
            </h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <GroupChat
                groupId={selectedGroupId}
                groupName={selectedGroup.name}
                userRole={userRole}
                onBack={() => {
                  setSelectedGroupId(null);
                  setSelectedGroup(null);
                }}
              />
            </div>
            <div>
              <GroupEvents groupId={selectedGroupId} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-green-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
            Group Space
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-8">Loading groups...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <GroupList
              groups={myGroups}
              onGroupSelect={handleGroupSelect}
              onRefresh={fetchGroups}
            />
            <div className="space-y-6">
              <GroupList
                groups={groups.filter(g => !myGroups.find(mg => mg.id === g.id))}
                onGroupSelect={handleGroupSelect}
                onRefresh={fetchGroups}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Friendships;
