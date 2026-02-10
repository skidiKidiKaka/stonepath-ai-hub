import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prompt {
  question: string;
  tip: string;
}

interface PCTSessionProps {
  pillar: string;
  topic: string;
  onComplete: () => void;
  onBack: () => void;
}

export const PCTSession = ({ pillar, topic, onComplete, onBack }: PCTSessionProps) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [summary, setSummary] = useState<{ summary: string; takeaways: string[] } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Fetch prompts on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Create session
        const { data: session, error: sessionError } = await supabase
          .from("pct_sessions")
          .insert({ user_id: user.id, pillar, topic })
          .select("id")
          .single();

        if (sessionError) throw sessionError;
        setSessionId(session.id);

        // Fetch AI prompts
        const { data, error } = await supabase.functions.invoke("generate-pct-prompts", {
          body: { pillar, topic, type: "prompts" },
        });

        if (error) throw error;
        setPrompts(data.prompts || []);
        setResponses(new Array(data.prompts?.length || 0).fill(""));
      } catch (e) {
        console.error(e);
        toast.error("Failed to generate prompts. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleNext = async () => {
    if (!responses[currentIndex].trim()) {
      toast.error("Please write a response before continuing.");
      return;
    }

    // Save response
    if (sessionId) {
      await supabase.from("pct_responses").insert({
        session_id: sessionId,
        prompt_text: prompts[currentIndex].question,
        response_text: responses[currentIndex],
        prompt_order: currentIndex + 1,
      });
    }

    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete session
      await completeSession();
    }
  };

  const completeSession = async () => {
    setCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get AI summary
      const { data: summaryData } = await supabase.functions.invoke("generate-pct-prompts", {
        body: {
          pillar, topic, type: "summary",
          responses: prompts.map((p, i) => ({ prompt: p.question, response: responses[i] })),
        },
      });

      setSummary(summaryData);

      // Update session
      if (sessionId) {
        await supabase.from("pct_sessions").update({
          completed_at: new Date().toISOString(),
          summary: summaryData?.summary || "",
        }).eq("id", sessionId);
      }

      // Update streaks
      const today = new Date().toISOString().split("T")[0];
      const { data: streak } = await supabase
        .from("pct_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!streak) {
        await supabase.from("pct_streaks").insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          total_sessions: 1,
          total_points: 10,
          last_session_date: today,
        });
      } else {
        const lastDate = streak.last_session_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        let newStreak = streak.current_streak;

        if (lastDate === today) {
          // Already did a session today, just add points
        } else if (lastDate === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        await supabase.from("pct_streaks").update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          total_sessions: streak.total_sessions + 1,
          total_points: streak.total_points + 10,
          last_session_date: today,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }

      toast.success("Session complete! +10 points 🎉");
    } catch (e) {
      console.error(e);
      toast.error("Failed to complete session.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Generating your reflection prompts...</p>
      </div>
    );
  }

  if (summary) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Session Complete 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-center">{summary.summary}</p>
          <div>
            <h4 className="font-semibold mb-3">Your Takeaways</h4>
            <ul className="space-y-2">
              {summary.takeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button className="w-full" onClick={onComplete}>Back to Headspace Hangout</Button>
        </CardContent>
      </Card>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No prompts available. Please try again.</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / prompts.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <span className="text-sm text-muted-foreground">{currentIndex + 1} of {prompts.length}</span>
      </div>

      <Progress value={progress} className="h-2" />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-lg font-semibold">{prompts[currentIndex].question}</h3>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
            <span>{prompts[currentIndex].tip}</span>
          </div>

          <Textarea
            placeholder="Take your time and write your thoughts..."
            value={responses[currentIndex]}
            onChange={(e) => {
              const updated = [...responses];
              updated[currentIndex] = e.target.value;
              setResponses(updated);
            }}
            className="min-h-[150px]"
          />

          <Button className="w-full" onClick={handleNext} disabled={completing}>
            {completing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {currentIndex < prompts.length - 1 ? (
              <>Next <ArrowRight className="w-4 h-4 ml-1" /></>
            ) : (
              <>Complete Session <Check className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
