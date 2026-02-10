import { useEffect, useState } from "react";
import { Flame, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PCTStatsData {
  current_streak: number;
  total_sessions: number;
  total_points: number;
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

      setStats(data || { current_streak: 0, total_sessions: 0, total_points: 0 });
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
    <div className="grid grid-cols-3 gap-4">
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
    </div>
  );
};
