import { useState, useEffect } from "react";
import { UserMinus, MessageCircle, Users, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const DEMO_PEER_UUID = "00000000-0000-0000-0000-000000000001";

interface Peer {
  id: string;
  peer_id: string;
  created_at: string;
  name: string;
  avatar: string | null;
}

export const TrustedPeersList = () => {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPeers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: trustedPeers } = await supabase
      .from("trusted_peers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!trustedPeers || trustedPeers.length === 0) {
      setPeers([]);
      setLoading(false);
      return;
    }

    const peerIds = trustedPeers.map(tp => tp.peer_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", peerIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    setPeers(
      trustedPeers.map(tp => {
        const profile = profileMap.get(tp.peer_id);
        return {
          id: tp.id,
          peer_id: tp.peer_id,
          created_at: tp.created_at || "",
          name: tp.peer_id === DEMO_PEER_UUID ? "Alex" : (profile?.full_name || "Peer"),
          avatar: profile?.avatar_url || null,
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => { fetchPeers(); }, []);

  const handleRemove = async (id: string) => {
    await supabase.from("trusted_peers").delete().eq("id", id);
    setPeers(prev => prev.filter(p => p.id !== id));
    toast.success("Friend removed");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (peers.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <Users className="w-10 h-10 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground">No friends yet</p>
        <p className="text-xs text-muted-foreground">Connect with peers in Peer Connect sessions to add them as friends</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {peers.map((peer) => (
        <Card key={peer.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              {peer.avatar && <AvatarImage src={peer.avatar} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {peer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{peer.name}</p>
              <p className="text-xs text-muted-foreground">
                Added {peer.created_at ? format(new Date(peer.created_at), "MMM d, yyyy") : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => toast.info("Direct chat coming soon! 🚀")}>
                <MessageCircle className="w-4 h-4 mr-1" /> Chat
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {peer.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove them from your friends list. You can add them again later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(peer.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
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
