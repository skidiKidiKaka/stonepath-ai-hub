import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, MessageCircle, Calendar, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GroupList } from "@/components/GroupList";
import { GroupChat } from "@/components/GroupChat";
import { GroupEvents } from "@/components/GroupEvents";
import { UserAvailability } from "@/components/UserAvailability";
import { GroupAvailability } from "@/components/GroupAvailability";
import { FriendAvailabilityLookup } from "@/components/FriendAvailabilityLookup";
import { GroupMembers } from "@/components/GroupMembers";
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
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    <CardTitle>Friend Circle</CardTitle>
                  </div>
                  <CardDescription>Stay connected with your friends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["Alex", "Jordan", "Sam", "Taylor"].map((name, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">Last seen today</p>
                        </div>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <CardTitle>Upcoming Hangouts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Movie Night</p>
                      <p className="text-sm text-muted-foreground">Friday, 7:00 PM</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Study Group</p>
                      <p className="text-sm text-muted-foreground">Saturday, 2:00 PM</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-green-500" />
                    <CardTitle>Friendship Tips</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Check in with friends regularly</li>
                    <li>• Be a good listener</li>
                    <li>• Plan activities together</li>
                    <li>• Show appreciation and gratitude</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <CardTitle>Quick Actions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Send Message
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Plan Event
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Share Update
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <UserAvailability />
              <FriendAvailabilityLookup />
            </div>

            <GroupList onGroupSelect={handleGroupSelect} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <GroupChat
                groupId={selectedGroupId}
                groupName={selectedGroupName}
                userRole={userRole}
                onBack={handleBack}
              />
              <div className="space-y-6">
                <GroupMembers groupId={selectedGroupId} />
                <GroupEvents groupId={selectedGroupId} userRole={userRole} />
              </div>
            </div>
            <GroupAvailability groupId={selectedGroupId} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Friendships;
