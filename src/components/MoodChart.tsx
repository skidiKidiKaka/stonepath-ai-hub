import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

interface MoodEntry {
  id: string;
  mood_level: number;
  created_at: string;
}

const moodLabels = ["Very Unpleasant", "Unpleasant", "Slightly Unpleasant", "Neutral", "Slightly Pleasant", "Pleasant", "Very Pleasant"];

export const MoodChart = () => {
  const [weekData, setWeekData] = useState<any[]>([]);
  const [wellnessScore, setWellnessScore] = useState<number>(0);

  useEffect(() => {
    fetchWeeklyMoodData();
  }, []);

  const fetchWeeklyMoodData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const { data, error } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching mood data:", error);
      return;
    }

    // Create array for all days of the week
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const chartData = daysOfWeek.map(day => {
      const dayEntries = (data || []).filter(entry => 
        format(new Date(entry.created_at), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
      );
      
      const avgMood = dayEntries.length > 0
        ? dayEntries.reduce((sum, entry) => sum + entry.mood_level, 0) / dayEntries.length
        : null;

      return {
        day: format(day, "EEE"),
        mood: avgMood,
        fullDate: format(day, "MMM dd")
      };
    });

    setWeekData(chartData);
    calculateWellnessScore(data || []);
  };

  const calculateWellnessScore = (entries: MoodEntry[]) => {
    if (entries.length === 0) {
      setWellnessScore(0);
      return;
    }

    // Calculate weighted average (more recent entries have higher weight)
    let totalWeight = 0;
    let weightedSum = 0;

    entries.forEach((entry, index) => {
      const weight = index + 1; // More recent = higher weight
      const normalizedMood = (entry.mood_level / 6) * 100; // Convert 0-6 to 0-100
      weightedSum += normalizedMood * weight;
      totalWeight += weight;
    });

    const baseScore = weightedSum / totalWeight;

    // Bonus for consistency (logging regularly)
    const consistencyBonus = Math.min((entries.length / 7) * 10, 10); // Up to 10% bonus

    const finalScore = Math.min(Math.round(baseScore + consistencyBonus), 100);
    setWellnessScore(finalScore);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-300">Wellness Score</h3>
          <div className={`text-5xl font-bold ${getScoreColor(wellnessScore)}`}>
            {wellnessScore}
          </div>
          <p className="text-slate-400">{getScoreLabel(wellnessScore)}</p>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700">
        <h3 className="text-lg font-semibold text-slate-300 mb-4">This Week's Progress</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="day" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              domain={[0, 6]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#F3F4F6' }}
              formatter={(value: any, name: any, props: any) => {
                if (value === null) return ["No entry", "Mood"];
                return [moodLabels[Math.round(value)], "Mood"];
              }}
            />
            <Bar 
              dataKey="mood" 
              fill="#8B5CF6" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
