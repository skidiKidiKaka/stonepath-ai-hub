import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupList } from "@/components/GroupList";
import { GroupChat } from "@/components/GroupChat";
import { GroupEvents } from "@/components/GroupEvents";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Friendships = () => {
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("member");
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access Friendships",
        variant: "destructive",
      });
      navigate("/auth");
    }
  };

  const handleGroupSelect = async (groupId: string) => {
    const { data: groupData } = await supabase
      .from("groups" as any)
      .select("name")
      .eq("id", groupId)
      .maybeSingle();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: memberData } = await supabase
        .from("group_members" as any)
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      setUserRole((memberData as any)?.role || "member");
    }

    setSelectedGroupId(groupId);
    setSelectedGroupName((groupData as any)?.name || "Group");
  };

  const handleBack = () => {
    setSelectedGroupId(null);
    setSelectedGroupName("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-green-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
            Friendships
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!selectedGroupId ? (
          <GroupList onGroupSelect={handleGroupSelect} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <GroupChat
              groupId={selectedGroupId}
              groupName={selectedGroupName}
              userRole={userRole}
              onBack={handleBack}
            />
            <GroupEvents groupId={selectedGroupId} userRole={userRole} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Friendships;
