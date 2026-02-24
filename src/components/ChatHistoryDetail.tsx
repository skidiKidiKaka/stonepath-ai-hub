import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ChatHistoryDetailProps {
  sessionId: string;
  partnerName: string;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface IcebreakerResponse {
  card_index: number;
  selected_option: number;
  user_id: string;
}

export const ChatHistoryDetail = ({ sessionId, partnerName, onBack }: ChatHistoryDetailProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [responses, setResponses] = useState<IcebreakerResponse[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const [msgsRes, sessionRes, responsesRes] = await Promise.all([
        supabase
          .from("peer_connect_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true }),
        supabase
          .from("peer_connect_sessions")
          .select("prompts")
          .eq("id", sessionId)
          .single(),
        supabase
          .from("peer_connect_responses")
          .select("card_index, selected_option, user_id")
          .eq("session_id", sessionId),
      ]);

      setMessages((msgsRes.data as any) || []);
      setPrompts(sessionRes.data?.prompts as any[] || []);
      setResponses((responsesRes.data as any) || []);
      setLoading(false);
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Build icebreaker summary
  const icebreakerSummary = prompts.map((prompt: any, idx: number) => {
    const myResponse = responses.find(r => r.card_index === idx && r.user_id === currentUserId);
    const partnerResponse = responses.find(r => r.card_index === idx && r.user_id !== currentUserId);
    const options = prompt.options || [];
    return {
      question: prompt.question || prompt.text || `Question ${idx + 1}`,
      myAnswer: myResponse ? (options[myResponse.selected_option] || "—") : "—",
      partnerAnswer: partnerResponse ? (options[partnerResponse.selected_option] || "—") : "—",
    };
  });

  return (
    <Card className="flex flex-col max-h-[calc(100vh-12rem)] max-w-3xl mx-auto">
      <CardHeader className="border-b py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <CardTitle className="text-base">Chat with {partnerName}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {icebreakerSummary.length > 0 && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-4 mb-3">
            <p className="text-xs font-semibold text-muted-foreground text-center">🎯 Icebreaker Answers</p>
            {icebreakerSummary.map((item, i) => (
              <div key={i} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground text-center">{item.question}</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Partner answer - left */}
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {partnerName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg bg-muted px-3 py-2 text-xs">
                      <p className="font-medium text-muted-foreground mb-0.5">{partnerName}</p>
                      <p className="text-foreground">{item.partnerAnswer}</p>
                    </div>
                  </div>
                  {/* My answer - right */}
                  <div className="flex items-start gap-2 justify-end">
                    <div className="rounded-lg bg-primary px-3 py-2 text-xs">
                      <p className="font-medium text-primary-foreground/70 mb-0.5">You</p>
                      <p className="text-primary-foreground">{item.myAnswer}</p>
                    </div>
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-muted">Me</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.user_id === currentUserId ? "flex-row-reverse" : ""}`}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {msg.user_id === currentUserId ? "Me" : partnerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={`flex flex-col gap-1 max-w-[70%] ${msg.user_id === currentUserId ? "items-end" : ""}`}>
              <div
                className={`rounded-lg p-3 text-sm ${
                  msg.user_id === currentUserId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No messages in this session</p>
        )}
      </CardContent>
    </Card>
  );
};
