import { useEffect, useState } from "react";
import { Flame, Star, Trophy, Users, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PCTStatsData {
  current_streak: number;
  total_sessions: number;
  total_points: number;
  peer_sessions: number;
  trusted_peers: number;
}

export const PCTStats = ({ compact = false }: { compact?: boolean }) => {
  const [stats, setStats] = useState<PCTStatsData | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("pct_streaks")
        .select("current_streak, total_sessions, total_points")
        .eq("user_id", user.id)
        .maybeSingle();

      // Get peer stats
      const { count: peerCount } = await supabase
        .from("peer_connect_sessions" as any)
        .select("id", { count: "exact", head: true })
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq("status", "completed");

      const { count: trustedCount } = await supabase
        .from("trusted_peers" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStats({
        current_streak: data?.current_streak || 0,
        total_sessions: data?.total_sessions || 0,
        total_points: data?.total_points || 0,
        peer_sessions: peerCount || 0,
        trusted_peers: trustedCount || 0,
      });
    };
    fetchStats();
  }, []);

  if (!stats) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-500" />{stats.current_streak}</span>
        <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" />{stats.total_points}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
      <div className="flex flex-col items-center gap-1 p-4 rounded-lg bg-muted/50">
        <Flame className="w-6 h-6 text-orange-500" />
        <span className="text-2xl font-bold">{stats.current_streak}</span>
        <span className="text-xs text-muted-foreground">Day Streak</span>
      </div>
      <div className="flex flex-col items-center gap-1 p-4 rounded-lg bg-muted/50">
        <Trophy className="w-6 h-6 text-blue-500" />
        <span className="text-2xl font-bold">{stats.total_sessions}</span>
        <span className="text-xs text-muted-foreground">Sessions</span>
      </div>
      <div className="flex flex-col items-center gap-1 p-4 rounded-lg bg-muted/50">
        <Star className="w-6 h-6 text-yellow-500" />
        <span className="text-2xl font-bold">{stats.total_points}</span>
        <span className="text-xs text-muted-foreground">Points</span>
      </div>
      <div className="flex flex-col items-center gap-1 p-4 rounded-lg bg-muted/50">
        <Users className="w-6 h-6 text-primary" />
        <span className="text-2xl font-bold">{stats.peer_sessions}</span>
        <span className="text-xs text-muted-foreground">Peer Sessions</span>
      </div>
      <div className="flex flex-col items-center gap-1 p-4 rounded-lg bg-muted/50">
        <UserCheck className="w-6 h-6 text-primary" />
        <span className="text-2xl font-bold">{stats.trusted_peers}</span>
        <span className="text-xs text-muted-foreground">Trusted Peers</span>
      </div>
    </div>
  );
};
