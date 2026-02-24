import { useState, useEffect } from "react";
import { Trash2, MessageCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Session {
  id: string;
  pillar: string;
  completed_at: string;
  user_a: string;
  user_b: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
}

interface ChatHistoryProps {
  onViewSession: (sessionId: string, partnerName: string) => void;
}

export const ChatHistory = ({ onViewSession }: ChatHistoryProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawSessions } = await supabase
      .from("peer_connect_sessions")
      .select("*")
      .eq("status", "completed")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("completed_at", { ascending: false });

    if (!rawSessions || rawSessions.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    // Get partner IDs
    const partnerIds = rawSessions.map(s => s.user_a === user.id ? s.user_b : s.user_a);
    const uniqueIds = [...new Set(partnerIds)];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", uniqueIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Get last message for each session
    const enriched: Session[] = await Promise.all(
      rawSessions.map(async (s) => {
        const partnerId = s.user_a === user.id ? s.user_b : s.user_a;
        const profile = profileMap.get(partnerId);

        const { data: msgs } = await supabase
          .from("peer_connect_messages")
          .select("content")
          .eq("session_id", s.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          id: s.id,
          pillar: s.pillar,
          completed_at: s.completed_at || s.created_at || "",
          user_a: s.user_a,
          user_b: s.user_b,
          partnerName: profile?.full_name || "Peer",
          partnerAvatar: profile?.avatar_url || null,
          lastMessage: msgs?.[0]?.content || "No messages",
        };
      })
    );

    setSessions(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleDelete = async (sessionId: string) => {
    setDeleting(sessionId);
    try {
      await supabase.from("peer_connect_messages").delete().eq("session_id", sessionId);
      await supabase.from("peer_connect_responses").delete().eq("session_id", sessionId);
      await supabase.from("peer_connect_sessions").delete().eq("id", sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground">No past conversations yet</p>
        <p className="text-xs text-muted-foreground">Complete a Peer Connect session to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {sessions.map((s) => (
        <Card key={s.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              {s.partnerAvatar && <AvatarImage src={s.partnerAvatar} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {s.partnerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{s.partnerName}</span>
                <Badge variant="secondary" className="text-xs">{s.pillar}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{s.lastMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {s.completed_at ? format(new Date(s.completed_at), "MMM d, yyyy") : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => onViewSession(s.id, s.partnerName)}>
                View
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the chat history with {s.partnerName}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(s.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
