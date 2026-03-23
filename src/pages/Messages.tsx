import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  context: string | null;
  created_at: string;
  sender_name?: string;
}

const Messages = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  useEffect(() => {
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel("panel-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "panel_messages" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [{ data: received }, { data: sent }] = await Promise.all([
      supabase
        .from("panel_messages")
        .select("*")
        .eq("recipient_id", session.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("panel_messages")
        .select("*")
        .eq("sender_id", session.user.id)
        .order("created_at", { ascending: false }),
    ]);

    setMessages(received || []);
    setSentMessages(sent || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from("panel_messages")
      .update({ is_read: true })
      .eq("id", id);
    fetchMessages();
  };

  const sendMessage = async () => {
    if (!content.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSending(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    // Find recipient by email in profiles
    // For parent-child messaging, we look up linked accounts
    let recipientId: string | null = null;

    if (recipientEmail) {
      // Look up user by finding their profile (if they share a group, peer session, or parent link)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .limit(100);

      // For now, we'll use the linked accounts
      const { data: links } = await supabase
        .from("parent_student_links")
        .select("parent_id, student_id")
        .or(`parent_id.eq.${session.user.id},student_id.eq.${session.user.id}`)
        .eq("status", "active");

      if (links && links.length > 0) {
        const link = links[0];
        recipientId = link.parent_id === session.user.id ? link.student_id : link.parent_id;
      }
    }

    if (!recipientId) {
      // Try to find from linked accounts
      const { data: links } = await supabase
        .from("parent_student_links")
        .select("parent_id, student_id")
        .or(`parent_id.eq.${session.user.id},student_id.eq.${session.user.id}`)
        .eq("status", "active");

      if (links && links.length > 0) {
        const link = links[0];
        recipientId = link.parent_id === session.user.id ? link.student_id : link.parent_id;
      }
    }

    if (!recipientId) {
      toast.error("No linked account found. Please link your account first.");
      setSending(false);
      return;
    }

    const { error } = await supabase.from("panel_messages").insert({
      sender_id: session.user.id,
      recipient_id: recipientId,
      subject: subject || null,
      content,
      context: "direct_message",
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      toast.success("Message sent!");
      setSubject("");
      setContent("");
      fetchMessages();
    }
    setSending(false);
  };

  const getContextLabel = (ctx: string | null) => {
    switch (ctx) {
      case "parent_encouragement": return "Encouragement";
      case "admin_alert": return "Alert";
      case "parent_concern": return "Concern";
      default: return "Message";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/5 to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Compose */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Send a Message</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Subject (optional)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your message..." rows={3} />
            </div>
            <Button onClick={sendMessage} disabled={sending} className="w-full">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send to Linked Account
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="inbox">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inbox">
              Inbox {messages.filter(m => !m.is_read).length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{messages.filter(m => !m.is_read).length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-3 mt-4">
            {messages.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No messages yet</Card>
            ) : (
              messages.map((msg) => (
                <Card
                  key={msg.id}
                  className={`p-4 cursor-pointer transition-colors ${!msg.is_read ? "border-primary/50 bg-primary/5" : ""}`}
                  onClick={() => markAsRead(msg.id)}
                >
                  <div className="flex items-start gap-3">
                    {msg.is_read ? (
                      <MailOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {msg.subject && <p className="font-medium text-sm">{msg.subject}</p>}
                        <Badge variant="secondary" className="text-xs">{getContextLabel(msg.context)}</Badge>
                      </div>
                      <p className="text-sm mt-1">{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3 mt-4">
            {sentMessages.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No sent messages</Card>
            ) : (
              sentMessages.map((msg) => (
                <Card key={msg.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Send className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      {msg.subject && <p className="font-medium text-sm">{msg.subject}</p>}
                      <p className="text-sm mt-1">{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Messages;
