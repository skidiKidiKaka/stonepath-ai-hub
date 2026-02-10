import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PeerConnectCard } from "@/components/PeerConnectCard";
import { PeerConnectChat } from "@/components/PeerConnectChat";

interface MCQPrompt {
  question: string;
  options: string[];
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
  const [phase, setPhase] = useState<"cards" | "chat">("cards");
  const [partnerName, setPartnerName] = useState("Peer");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load existing responses and partner name
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Get partner name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", partnerId)
        .maybeSingle();
      if (profile?.full_name) setPartnerName(profile.full_name);

      // Load existing responses
      const { data: responses } = await supabase
        .from("peer_connect_responses" as any)
        .select("*")
        .eq("session_id", sessionId);

      if (responses) {
        const myNew = [...myAnswers];
        const partnerNew = [...partnerAnswers];
        (responses as any[]).forEach((r: any) => {
          if (r.user_id === user.id) {
            myNew[r.card_index] = r.selected_option;
          } else {
            partnerNew[r.card_index] = r.selected_option;
          }
        });
        setMyAnswers(myNew);
        setPartnerAnswers(partnerNew);
      }
    };
    init();
  }, [sessionId, partnerId]);

  // Subscribe to partner's responses
  useEffect(() => {
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
  }, [sessionId, currentUserId]);

  // Generate spark when both answers are revealed
  useEffect(() => {
    const generateSpark = async (idx: number) => {
      if (myAnswers[idx] === null || partnerAnswers[idx] === null) return;
      if (sparks[idx]) return;

      try {
        const { data } = await supabase.functions.invoke("generate-peer-prompts", {
          body: {
            type: "spark",
            question: prompts[idx].question,
            optionA: prompts[idx].options[myAnswers[idx]!],
            optionB: prompts[idx].options[partnerAnswers[idx]!],
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
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPhase("chat");
    }
  };

  const isCurrentRevealed = myAnswers[currentIndex] !== null && partnerAnswers[currentIndex] !== null;
  const progress = ((currentIndex + 1) / prompts.length) * 100;

  if (phase === "chat") {
    return (
      <PeerConnectChat
        sessionId={sessionId}
        partnerId={partnerId}
        partnerName={partnerName}
        onEnd={onComplete}
      />
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
