import { useState, useEffect, useRef } from "react";
import { Send, Image, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Message {
  id: string;
  content: string;
  image_url: string | null;
  user_id: string;
  is_moderated: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface GroupChatProps {
  groupId: string;
  groupName: string;
  userRole: string;
  onBack: () => void;
}

export const GroupChat = ({ groupId, groupName, userRole, onBack }: GroupChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchMessages();
    subscribeToMessages();
  }, [groupId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const messagesWithProfiles = await Promise.all(
        data.map(async (msg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", msg.user_id)
            .single();
          
          return { ...msg, profiles: profile };
        })
      );
      
      setMessages(messagesWithProfiles);
      scrollToBottom();
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", payload.new.user_id)
            .single();

          setMessages((current) => [
            ...current,
            { ...payload.new, profiles: profile } as Message,
          ]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      user_id: user.id,
      content: newMessage,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("group-photos")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("group-photos")
      .getPublicUrl(fileName);

    const { error: messageError } = await supabase.from("group_messages").insert({
      group_id: groupId,
      user_id: user.id,
      content: "Shared an image",
      image_url: publicUrl,
    });

    setUploading(false);

    if (messageError) {
      toast({
        title: "Error",
        description: "Failed to send image",
        variant: "destructive",
      });
    }
  };

  const toggleModeration = async (messageId: string, isModerated: boolean) => {
    const { error } = await supabase
      .from("group_messages")
      .update({ is_moderated: !isModerated })
      .eq("id", messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
      return;
    }

    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, is_moderated: !isModerated } : m
    ));

    toast({
      title: "Success",
      description: isModerated ? "Message unmarked" : "Message flagged for moderation",
    });
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("group_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
      return;
    }

    setMessages(messages.filter(m => m.id !== messageId));
    toast({
      title: "Success",
      description: "Message deleted",
    });
  };

  const canModerate = userRole === "admin" || userRole === "moderator";

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>{groupName}</CardTitle>
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[70%] ${message.user_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-3`}>
                {message.is_moderated && (
                  <Alert className="mb-2 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Flagged for moderation
                    </AlertDescription>
                  </Alert>
                )}
                {message.profiles?.full_name && message.user_id !== user?.id && (
                  <p className="text-xs font-semibold mb-1">
                    {message.profiles.full_name}
                  </p>
                )}
                <p className="text-sm">{message.content}</p>
                {message.image_url && (
                  <img
                    src={message.image_url}
                    alt="Shared"
                    className="mt-2 rounded max-w-full"
                  />
                )}
                <div className="flex items-center gap-2 justify-between mt-1">
                  <p className="text-xs opacity-70">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                  {(canModerate || message.user_id === user?.id) && (
                    <div className="flex gap-1">
                      {canModerate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => toggleModeration(message.id, message.is_moderated)}
                        >
                          <AlertCircle className="h-3 w-3" />
                        </Button>
                      )}
                      {(message.user_id === user?.id || canModerate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Image className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={uploading}
          />
          <Button type="submit" size="icon" disabled={uploading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};