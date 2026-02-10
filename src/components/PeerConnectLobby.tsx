import { useState, useEffect } from "react";
import { Loader2, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PeerConnectLobbyProps {
  pillar: string;
  pillarColor: string;
  onMatched: (sessionId: string, prompts: any[], partnerId: string) => void;
  onCancel: () => void;
}

export const PeerConnectLobby = ({ pillar, pillarColor, onMatched, onCancel }: PeerConnectLobbyProps) => {
  const [status, setStatus] = useState<"joining" | "waiting" | "matched">("joining");
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [dots, setDots] = useState("");

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Join lobby
  useEffect(() => {
    const joinLobby = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("peer-connect-match", {
          body: { pillar, demo: true },
        });

        if (error) throw error;

        if (data.status === "matched") {
          setStatus("matched");
          setTimeout(() => {
            onMatched(data.sessionId, data.prompts, data.partnerId);
          }, 1500);
        } else {
          setStatus("waiting");
          setLobbyId(data.lobbyId);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to join lobby. Please try again.");
        onCancel();
      }
    };

    joinLobby();
  }, [pillar]);

  // Subscribe to lobby changes for real-time matching
  useEffect(() => {
    if (status !== "waiting") return;

    const channel = supabase
      .channel("peer-lobby-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "peer_connect_lobby",
          filter: lobbyId ? `id=eq.${lobbyId}` : undefined,
        },
        async (payload: any) => {
          const updated = payload.new;
          if (updated.status === "matched" && updated.session_id) {
            setStatus("matched");

            // Fetch session data
            const { data: session } = await supabase
              .from("peer_connect_sessions" as any)
              .select("*")
              .eq("id", updated.session_id)
              .single();

            if (session) {
              const s = session as any;
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              const pId = s.user_a === currentUser?.id ? s.user_b : s.user_a;
              setTimeout(() => {
                onMatched(s.id, s.prompts, pId);
              }, 1500);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, lobbyId]);

  // Cleanup on cancel
  const handleCancel = async () => {
    if (lobbyId) {
      await supabase
        .from("peer_connect_lobby" as any)
        .delete()
        .eq("id", lobbyId);
    }
    onCancel();
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="relative">
        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${pillarColor} flex items-center justify-center`}>
          <Users className="w-10 h-10 text-white" />
        </div>
        {status === "waiting" && (
          <>
            <div className={`absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br ${pillarColor} animate-ping opacity-20`} />
            <div className={`absolute -inset-2 w-28 h-28 rounded-full bg-gradient-to-br ${pillarColor} animate-pulse opacity-10`} />
          </>
        )}
        {status === "matched" && (
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-bounce">
            <Zap className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        {status === "joining" && (
          <>
            <h2 className="text-xl font-bold">Joining lobby{dots}</h2>
            <p className="text-muted-foreground">Setting things up</p>
          </>
        )}
        {status === "waiting" && (
          <>
            <h2 className="text-xl font-bold">Looking for a peer{dots}</h2>
            <p className="text-muted-foreground">
              Waiting for someone else interested in <span className="font-medium text-foreground">{pillar}</span>
            </p>
          </>
        )}
        {status === "matched" && (
          <>
            <h2 className="text-xl font-bold text-primary">Match found! 🎉</h2>
            <p className="text-muted-foreground">Getting your conversation cards ready...</p>
          </>
        )}
      </div>

      {status !== "matched" && (
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      )}

      {status === "waiting" && (
        <Card className="max-w-sm">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <p>💡 Tip: You'll both answer the same 3 questions, then reveal each other's answers. It's a great way to start a real conversation!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
