import { useState, useEffect, useRef } from "react";
import { Send, UserPlus, LogOut, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getConnectionLabel } from "@/data/peerConnectQuestions";

const DEMO_PEER_UUID = "00000000-0000-0000-0000-000000000001";
const AI_BANTER_ID = "ai-wingman";

interface AnswerSummaryItem {
  question: string;
  myAnswer: string;
  partnerAnswer: string;
}

interface PeerConnectChatProps {
  sessionId: string;
  partnerId: string;
  partnerName: string;
  onEnd: () => void;
  answerSummary?: AnswerSummaryItem[];
  connectionScore?: number;
  onResumeQuestions?: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  isAiBanter?: boolean;
}

export const PeerConnectChat = ({
  sessionId,
  partnerId,
  partnerName,
  onEnd,
  answerSummary,
  connectionScore = 0,
  onResumeQuestions,
}: PeerConnectChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [addedAsPeer, setAddedAsPeer] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messagesSinceLastBanter, setMessagesSinceLastBanter] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDemo = partnerId === DEMO_PEER_UUID;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("peer_connect_messages" as any)
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as any);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (!isDemo && user) {
        const { data: existing } = await supabase
          .from("trusted_peers" as any)
          .select("id")
          .eq("user_id", user.id)
          .eq("peer_id", partnerId)
          .maybeSingle();
        if (existing) setAddedAsPeer(true);
      }
    };

    init();
    fetchMessages().then(() => {
      if (isDemo) {
        triggerAlexFirstMessage();
      }
    });

    const channel = supabase
      .channel(`peer-chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "peer_connect_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const triggerAlexFirstMessage = async () => {
    const { data: existing } = await supabase
      .from("peer_connect_messages" as any)
      .select("id")
      .eq("session_id", sessionId)
      .limit(1);
    if (existing && existing.length > 0) return;

    setIsTyping(true);
    setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke("generate-peer-prompts", {
          body: {
            type: "demo-chat",
            messages: [],
            pillar: "general",
            answerSummary: answerSummary?.slice(0, 5),
            isFirstMessage: true,
          },
        });
        const reply = data?.reply || "Hey! That was fun 😄 What surprised you most about our answers?";
        await supabase.from("peer_connect_messages" as any).insert({
          session_id: sessionId,
          user_id: DEMO_PEER_UUID,
          content: reply,
        });
      } catch (e) {
        console.error("Alex first message failed:", e);
        await supabase.from("peer_connect_messages" as any).insert({
          session_id: sessionId,
          user_id: DEMO_PEER_UUID,
          content: "Hey! That was really fun 😄 What surprised you most about our answers?",
        });
      } finally {
        setIsTyping(false);
      }
    }, 800 + Math.random() * 1200);
  };

  const triggerAiBanter = async () => {
    try {
      const recentMsgs = messages.slice(-8).map((m) => ({
        content: m.content,
        isMe: m.user_id === currentUserId,
      }));

      const { data } = await supabase.functions.invoke("generate-peer-prompts", {
        body: {
          type: "ai-banter",
          messages: recentMsgs,
          answerSummary: answerSummary?.slice(0, 5),
        },
      });

      if (data?.banter) {
        const banterMsg: ChatMessage = {
          id: `banter-${Date.now()}`,
          content: data.banter,
          user_id: AI_BANTER_ID,
          created_at: new Date().toISOString(),
          isAiBanter: true,
        };
        setMessages((prev) => [...prev, banterMsg]);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) {
      console.error("AI banter failed:", e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;

    const messageText = newMessage;
    setNewMessage("");

    const { error } = await supabase.from("peer_connect_messages" as any).insert({
      session_id: sessionId,
      user_id: currentUserId,
      content: messageText,
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    // Track messages for AI banter
    const newCount = messagesSinceLastBanter + 1;
    setMessagesSinceLastBanter(newCount);

    // Trigger banter every 4-5 messages
    if (newCount >= 4 + Math.floor(Math.random() * 2)) {
      setMessagesSinceLastBanter(0);
      setTimeout(() => triggerAiBanter(), 2000);
    }

    // Demo mode: get AI reply
    if (isDemo) {
      const delay = 500 + Math.random() * 1000;
      setIsTyping(true);

      setTimeout(async () => {
        try {
          const currentMessages = await supabase
            .from("peer_connect_messages" as any)
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true });

          const chatHistory = ((currentMessages.data as any[]) || []).map((m: any) => ({
            content: m.content,
            isMe: m.user_id === currentUserId,
          }));

          const { data } = await supabase.functions.invoke("generate-peer-prompts", {
            body: {
              type: "demo-chat",
              messages: chatHistory,
              pillar: "general",
              answerSummary: answerSummary?.slice(0, 5),
            },
          });

          const reply = data?.reply || "That's really cool! Tell me more 😊";

          await supabase.from("peer_connect_messages" as any).insert({
            session_id: sessionId,
            user_id: DEMO_PEER_UUID,
            content: reply,
          });
        } catch (e) {
          console.error("Demo chat failed:", e);
        } finally {
          setIsTyping(false);
        }
      }, delay);
    }
  };

  const handleAddTrustedPeer = async () => {
    if (!currentUserId) return;

    const { error } = await supabase.from("trusted_peers" as any).insert({
      user_id: currentUserId,
      peer_id: partnerId,
    });

    if (error) {
      toast.error("Failed to add trusted peer");
      return;
    }

    setAddedAsPeer(true);
    toast.success("Added as Friend! 🤝");
  };

  const handleEndSession = async () => {
    await supabase
      .from("peer_connect_sessions" as any)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        connection_score: connectionScore,
      })
      .eq("id", sessionId);

    if (currentUserId) {
      const { data: streak } = await supabase
        .from("pct_streaks")
        .select("*")
        .eq("user_id", currentUserId)
        .maybeSingle();

      const today = new Date().toISOString().split("T")[0];
      const points = Math.max(15, connectionScore);

      if (!streak) {
        await supabase.from("pct_streaks").insert({
          user_id: currentUserId,
          current_streak: 1,
          longest_streak: 1,
          total_sessions: 1,
          total_points: points,
          last_session_date: today,
        });
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        let newStreak = streak.current_streak;
        if (streak.last_session_date === today) {
          // noop
        } else if (streak.last_session_date === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        await supabase.from("pct_streaks").update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          total_sessions: streak.total_sessions + 1,
          total_points: streak.total_points + points,
          last_session_date: today,
          updated_at: new Date().toISOString(),
        }).eq("user_id", currentUserId);
      }
    }

    toast.success(`Session complete! +${Math.max(15, connectionScore)} points 🎉`);
    onEnd();
  };

  const connectionLabel = getConnectionLabel(connectionScore);

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] max-w-3xl mx-auto">
      <CardHeader className="border-b py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Chat with {partnerName}</CardTitle>
            {connectionScore > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {connectionLabel} · {connectionScore}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onResumeQuestions && (
              <Button variant="outline" size="sm" onClick={onResumeQuestions}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Resume Questions
              </Button>
            )}
            {!addedAsPeer && (
              <Button variant="outline" size="sm" onClick={handleAddTrustedPeer}>
                <UserPlus className="w-4 h-4 mr-1" /> Add Peer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleEndSession}>
              <LogOut className="w-4 h-4 mr-1" /> End
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {answerSummary && answerSummary.length > 0 && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-4 mb-3">
            <p className="text-xs font-semibold text-muted-foreground text-center">🎯 Icebreaker Answers</p>
            {answerSummary.map((item, i) => (
              <div key={i} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground text-center">{item.question}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{partnerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg bg-muted px-3 py-2 text-xs">
                      <p className="font-medium text-muted-foreground mb-0.5">{partnerName}</p>
                      <p className="text-foreground">{item.partnerAnswer}</p>
                    </div>
                  </div>
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
        <div className="text-center text-sm text-muted-foreground py-2">
          💬 Chat unlocked! Continue the conversation naturally.
        </div>

        {messages.map((msg) => {
          // AI Banter bubble
          if (msg.isAiBanter || msg.user_id === AI_BANTER_ID) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 border border-accent text-xs text-muted-foreground max-w-[80%]">
                  <Sparkles className="w-3 h-3 shrink-0 text-primary" />
                  <span className="italic">{msg.content}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.user_id === currentUserId ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {msg.user_id === currentUserId ? "Me" : partnerName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`flex flex-col gap-1 max-w-[70%] ${
                  msg.user_id === currentUserId ? "items-end" : ""
                }`}
              >
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
          );
        })}

        {isTyping && (
          <div className="flex gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{partnerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="rounded-lg p-3 text-sm bg-muted">
              <span className="animate-pulse">typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
