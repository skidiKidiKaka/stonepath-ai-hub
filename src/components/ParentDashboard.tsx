import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Heart, BookOpen, MessageSquare, Bell, Link2, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface LinkedChild {
  id: string;
  student_id: string;
  status: string;
  profile?: {
    full_name: string | null;
    school: string | null;
    grade: string | null;
    avatar_url: string | null;
  };
}

interface MoodEntry {
  mood_level: number;
  created_at: string;
  feelings: string[];
}

interface Assignment {
  title: string;
  due_date: string;
  status: string;
  subject: string | null;
}

export const ParentDashboard = () => {
  const navigate = useNavigate();
  const [linkCode, setLinkCode] = useState("");
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [childMoods, setChildMoods] = useState<MoodEntry[]>([]);
  const [childAssignments, setChildAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [linking, setLinking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinkedChildren();
    fetchAnnouncements();
    fetchUnreadMessages();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildMoods(selectedChild);
      fetchChildAssignments(selectedChild);
    }
  }, [selectedChild]);

  const fetchLinkedChildren = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: links } = await supabase
      .from("parent_student_links")
      .select("id, student_id, status")
      .eq("parent_id", session.user.id);

    if (links && links.length > 0) {
      const activeLinks = links.filter(l => l.status === "active");
      const enriched: LinkedChild[] = [];

      for (const link of activeLinks) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, school, grade, avatar_url")
          .eq("user_id", link.student_id)
          .single();

        enriched.push({ ...link, profile: profile || undefined });
      }

      setLinkedChildren(enriched);
      if (enriched.length > 0 && !selectedChild) {
        setSelectedChild(enriched[0].student_id);
      }
    }
    setLoading(false);
  };

  const fetchChildMoods = async (studentId: string) => {
    const { data } = await supabase
      .from("mood_entries")
      .select("mood_level, created_at, feelings")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(7);

    setChildMoods(data || []);
  };

  const fetchChildAssignments = async (studentId: string) => {
    const { data } = await supabase
      .from("assignments")
      .select("title, due_date, status, subject")
      .eq("user_id", studentId)
      .order("due_date", { ascending: true })
      .limit(10);

    setChildAssignments(data || []);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    setAnnouncements(data || []);
  };

  const fetchUnreadMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { count } = await supabase
      .from("panel_messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", session.user.id)
      .eq("is_read", false);

    setUnreadMessages(count || 0);
  };

  const handleLinkChild = async () => {
    if (!linkCode.trim()) {
      toast.error("Please enter a link code");
      return;
    }
    setLinking(true);

    const { data, error } = await supabase.rpc("claim_parent_link", {
      _code: linkCode.trim().toUpperCase(),
    });

    if (error) {
      toast.error("Failed to link. Please try again.");
      setLinking(false);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      toast.error(result?.message || "Invalid link code");
    } else {
      toast.success("Successfully linked to your child's account!");
      setLinkCode("");
      fetchLinkedChildren();
    }
    setLinking(false);
  };

  const getMoodEmoji = (level: number) => {
    if (level >= 8) return "😊";
    if (level >= 6) return "🙂";
    if (level >= 4) return "😐";
    if (level >= 2) return "😟";
    return "😢";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "in-progress": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default: return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Link Child Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Link2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Link Your Child</h3>
            <p className="text-sm text-muted-foreground">Enter the code your child generated from their profile</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
            placeholder="Enter link code (e.g., ABC123)"
            maxLength={8}
            className="font-mono tracking-wider"
          />
          <Button onClick={handleLinkChild} disabled={linking}>
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
          </Button>
        </div>
      </Card>

      {/* Linked Children */}
      {linkedChildren.length > 0 ? (
        <>
          {/* Child Selector */}
          {linkedChildren.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {linkedChildren.map((child) => (
                <Button
                  key={child.student_id}
                  variant={selectedChild === child.student_id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChild(child.student_id)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  {child.profile?.full_name || "Child"}
                </Button>
              ))}
            </div>
          )}

          {/* Selected Child Overview */}
          {selectedChild && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mood Overview */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <h3 className="font-semibold">Recent Mood</h3>
                </div>
                {childMoods.length > 0 ? (
                  <div className="space-y-3">
                    {childMoods.slice(0, 5).map((mood, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getMoodEmoji(mood.mood_level)}</span>
                          <span className="text-sm">{mood.mood_level}/10</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(mood.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No mood entries yet</p>
                )}
              </Card>

              {/* Assignments Overview */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Assignments</h3>
                </div>
                {childAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {childAssignments.slice(0, 5).map((assignment, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">{assignment.subject}</p>
                        </div>
                        <Badge variant="secondary" className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No assignments yet</p>
                )}
              </Card>
            </div>
          )}
        </>
      ) : (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No Children Linked</h3>
          <p className="text-sm text-muted-foreground">
            Ask your child to generate a link code from their profile settings, then enter it above.
          </p>
        </Card>
      )}

      {/* Messages */}
      <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/messages")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Messages</h3>
              <p className="text-sm text-muted-foreground">Send encouragement or contact school</p>
            </div>
          </div>
          {unreadMessages > 0 && (
            <Badge variant="destructive">{unreadMessages}</Badge>
          )}
        </div>
      </Card>

      {/* Announcements */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">School Announcements</h3>
        </div>
        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{a.title}</h4>
                  {a.is_pinned && <Badge variant="secondary" className="text-xs">Pinned</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{a.content.slice(0, 100)}...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No announcements yet</p>
        )}
      </Card>
    </div>
  );
};
