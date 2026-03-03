import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, MessageCircle, Flame, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PeerConnectCard } from "@/components/PeerConnectCard";
import { PeerConnectChat } from "@/components/PeerConnectChat";
import {
  DEPTH_LABELS,
  getConnectionLabel,
  calculateConnectionPoints,
} from "@/data/peerConnectQuestions";

const DEMO_PEER_UUID = "00000000-0000-0000-0000-000000000001";

interface MCQPrompt {
  question: string;
  options: string[];
  depth?: number;
}

interface PeerConnectSessionProps {
  sessionId: string;
  prompts: MCQPrompt[];
  partnerId: string;
  onComplete: () => void;
  onBack: () => void;
}

export const PeerConnectSession = ({ sessionId, prompts, partnerId, onComplete, onBack }: PeerConnectSessionProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myAnswers, setMyAnswers] = useState<(number | null)[]>(new Array(prompts.length).fill(null));
  const [partnerAnswers, setPartnerAnswers] = useState<(number | null)[]>(new Array(prompts.length).fill(null));
  const [sparks, setSparks] = useState<(string | null)[]>(new Array(prompts.length).fill(null));
  const [phase, setPhase] = useState<"cards" | "chat" | "checkpoint">("cards");
  const [partnerName, setPartnerName] = useState("Peer");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectionScore, setConnectionScore] = useState(0);

  const isDemo = partnerId === DEMO_PEER_UUID;

  // Current depth level based on current question
  const currentDepth = prompts[currentIndex]?.depth || 1;

  // Load existing responses and partner name
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (isDemo) {
        setPartnerName("Alex");
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", partnerId)
          .maybeSingle();
        if (profile?.full_name) setPartnerName(profile.full_name);
      }

      const { data: responses } = await supabase
        .from("peer_connect_responses" as any)
        .select("*")
        .eq("session_id", sessionId);

      if (responses) {
        const myNew = new Array(prompts.length).fill(null);
        const partnerNew = new Array(prompts.length).fill(null);
        let score = 0;
        (responses as any[]).forEach((r: any) => {
          if (r.user_id === user.id) {
            myNew[r.card_index] = r.selected_option;
          } else {
            partnerNew[r.card_index] = r.selected_option;
          }
        });
        // Recalculate score from existing answers
        for (let i = 0; i < prompts.length; i++) {
          if (myNew[i] !== null && partnerNew[i] !== null) {
            score += calculateConnectionPoints(myNew[i], partnerNew[i], prompts[i].depth || 1);
          }
        }
        setMyAnswers(myNew);
        setPartnerAnswers(partnerNew);
        setConnectionScore(score);
      }
    };
    init();
  }, [sessionId, partnerId]);

  // Subscribe to partner's responses (skip for demo)
  useEffect(() => {
    if (isDemo) return;

    const channel = supabase
      .channel(`peer-responses-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "peer_connect_responses",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload: any) => {
          const response = payload.new;
          if (response.user_id !== currentUserId) {
            setPartnerAnswers((prev) => {
              const updated = [...prev];
              updated[response.card_index] = response.selected_option;
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentUserId, isDemo]);

  // Generate spark when both answers are revealed
  useEffect(() => {
    const generateSpark = async (idx: number) => {
      if (myAnswers[idx] === null || partnerAnswers[idx] === null) return;
      if (sparks[idx]) return;

      // Calculate points for this question
      const points = calculateConnectionPoints(
        myAnswers[idx]!,
        partnerAnswers[idx]!,
        prompts[idx].depth || 1
      );
      if (points > 0) {
        setConnectionScore((prev) => Math.min(100, prev + points));
      }

      try {
        const { data } = await supabase.functions.invoke("generate-peer-prompts", {
          body: {
            type: "spark",
            question: prompts[idx].question,
            optionA: prompts[idx].options[myAnswers[idx]!],
            optionB: prompts[idx].options[partnerAnswers[idx]!],
            depth: prompts[idx].depth || 1,
          },
        });
        if (data?.spark) {
          setSparks((prev) => {
            const updated = [...prev];
            updated[idx] = data.spark;
            return updated;
          });
        }
      } catch (e) {
        console.error("Spark generation failed:", e);
      }
    };

    generateSpark(currentIndex);
  }, [myAnswers, partnerAnswers, currentIndex]);

  // Save connection score to DB periodically
  const saveConnectionScore = useCallback(async () => {
    if (!sessionId || connectionScore === 0) return;
    await supabase
      .from("peer_connect_sessions" as any)
      .update({ connection_score: connectionScore })
      .eq("id", sessionId);
  }, [sessionId, connectionScore]);

  useEffect(() => {
    saveConnectionScore();
  }, [connectionScore]);

  const handleSubmitAnswer = async (selectedOption: number) => {
    if (!currentUserId) return;

    const { error } = await supabase.from("peer_connect_responses" as any).insert({
      session_id: sessionId,
      user_id: currentUserId,
      card_index: currentIndex,
      selected_option: selectedOption,
    });

    if (error) {
      toast.error("Failed to submit answer");
      return;
    }

    setMyAnswers((prev) => {
      const updated = [...prev];
      updated[currentIndex] = selectedOption;
      return updated;
    });

    // Demo mode: simulate partner answering
    if (isDemo) {
      const delay = 300 + Math.random() * 400;
      setTimeout(async () => {
        try {
          const { data } = await supabase.functions.invoke("generate-peer-prompts", {
            body: {
              type: "demo-answer",
              question: prompts[currentIndex].question,
              options: prompts[currentIndex].options,
            },
          });
          const aiOption = data?.selectedOption ?? Math.floor(Math.random() * 5);
          await supabase.from("peer_connect_responses" as any).insert({
            session_id: sessionId,
            user_id: DEMO_PEER_UUID,
            card_index: currentIndex,
            selected_option: aiOption,
          });
          setPartnerAnswers((prev) => {
            const updated = [...prev];
            updated[currentIndex] = aiOption;
            return updated;
          });
        } catch (e) {
          console.error("Demo answer failed:", e);
          const fallback = Math.floor(Math.random() * 5);
          supabase.from("peer_connect_responses" as any).insert({
            session_id: sessionId,
            user_id: DEMO_PEER_UUID,
            card_index: currentIndex,
            selected_option: fallback,
          });
          setPartnerAnswers((prev) => {
            const updated = [...prev];
            updated[currentIndex] = fallback;
            return updated;
          });
        }
      }, delay);
    }
  };

  const handleNext = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= prompts.length) {
      setPhase("chat");
      return;
    }
    // Checkpoint every 5 questions
    if (nextIdx > 0 && nextIdx % 5 === 0) {
      setPhase("checkpoint");
    } else {
      setCurrentIndex(nextIdx);
    }
  };

  const handleGoDeeper = () => {
    setCurrentIndex(currentIndex + 1);
    setPhase("cards");
  };

  const handleStartChat = () => {
    setPhase("chat");
  };

  const handleResumeQuestions = () => {
    setPhase("cards");
  };

  const isCurrentRevealed = myAnswers[currentIndex] !== null && partnerAnswers[currentIndex] !== null;
  const progress = ((currentIndex + 1) / prompts.length) * 100;
  const connectionLabel = getConnectionLabel(connectionScore);

  // Build answer summary for chat
  const answerSummary = prompts.map((p, i) => ({
    question: p.question,
    myAnswer: myAnswers[i] !== null ? p.options[myAnswers[i]!] : "—",
    partnerAnswer: partnerAnswers[i] !== null ? p.options[partnerAnswers[i]!] : "—",
  })).filter((_, i) => myAnswers[i] !== null && partnerAnswers[i] !== null);

  if (phase === "chat") {
    return (
      <PeerConnectChat
        sessionId={sessionId}
        partnerId={partnerId}
        partnerName={partnerName}
        onEnd={onComplete}
        answerSummary={answerSummary}
        connectionScore={connectionScore}
        onResumeQuestions={currentIndex < prompts.length - 1 ? handleResumeQuestions : undefined}
      />
    );
  }

  if (phase === "checkpoint") {
    const nextDepth = prompts[currentIndex + 1]?.depth || currentDepth;
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Leave
          </Button>
          <span className="text-sm text-muted-foreground">
            with <span className="font-medium text-foreground">{partnerName}</span>
          </span>
        </div>

        <ConnectionMeter score={connectionScore} label={connectionLabel} />

        <Card className="overflow-hidden">
          <CardContent className="pt-8 pb-8 space-y-6 text-center">
            <div className="space-y-2">
              <Flame className="w-10 h-10 mx-auto text-primary" />
              <h2 className="text-xl font-bold">Checkpoint!</h2>
              <p className="text-muted-foreground text-sm">
                You've answered {currentIndex + 1} questions together
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <DepthGauge currentDepth={currentDepth} nextDepth={nextDepth} />
            </div>

            <p className="text-sm text-muted-foreground">
              Next up: <span className="font-semibold text-foreground">{DEPTH_LABELS[nextDepth]}</span> level questions
            </p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button onClick={handleGoDeeper} className="w-full">
                <ChevronDown className="w-4 h-4 mr-1" /> Go Deeper
              </Button>
              <Button variant="outline" onClick={handleStartChat} className="w-full">
                <MessageCircle className="w-4 h-4 mr-1" /> Start Chatting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Leave
        </Button>
        <span className="text-sm text-muted-foreground">
          with <span className="font-medium text-foreground">{partnerName}</span>
        </span>
      </div>

      <ConnectionMeter score={connectionScore} label={connectionLabel} />

      <Progress value={progress} className="h-2" />

      <PeerConnectCard
        prompt={prompts[currentIndex]}
        cardIndex={currentIndex}
        totalCards={prompts.length}
        onSubmit={handleSubmitAnswer}
        myAnswer={myAnswers[currentIndex]}
        partnerAnswer={partnerAnswers[currentIndex]}
        spark={sparks[currentIndex]}
        waitingForPartner={myAnswers[currentIndex] !== null && partnerAnswers[currentIndex] === null}
      />

      {isCurrentRevealed && (
        <Button className="w-full" onClick={handleNext}>
          {currentIndex < prompts.length - 1 ? (
            <>Next Card <ArrowRight className="w-4 h-4 ml-1" /></>
          ) : (
            <>Open Chat <MessageCircle className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      )}
    </div>
  );
};

// --- Sub-components ---

function ConnectionMeter({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Connection</span>
          <span className="font-semibold text-foreground">{label}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
      </div>
      <span className="text-lg font-bold text-primary">{score}</span>
    </div>
  );
}

function DepthGauge({ currentDepth, nextDepth }: { currentDepth: number; nextDepth: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((d) => (
        <div key={d} className="flex flex-col items-center gap-1">
          <div
            className={`w-12 h-2 rounded-full transition-all ${
              d <= currentDepth
                ? "bg-primary"
                : d === nextDepth
                ? "bg-primary/30 animate-pulse"
                : "bg-muted"
            }`}
          />
          <span className={`text-[10px] ${d <= currentDepth ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {DEPTH_LABELS[d]}
          </span>
        </div>
      ))}
    </div>
  );
}
