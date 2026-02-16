import { useState, useEffect, useRef } from "react";
import { Send, Image as ImageIcon, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  is_moderated: boolean;
  user_name?: string;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data: messagesData, error } = await supabase
      .from("group_messages" as any)
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
      return;
    }

    const messagesWithNames = await Promise.all(
      (messagesData || []).map(async (msg: any) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", msg.user_id)
          .single();
        
        return {
          ...msg,
          user_name: profile?.full_name || "Anonymous",
        };
      })
    );

    setMessages(messagesWithNames as Message[]);
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    
    initUser();
    fetchMessages();

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send messages",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("group_messages" as any).insert({
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
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload photos",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("group-photos")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload Failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("group-photos")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      toast({
        title: "Error",
        description: "Failed to generate photo URL",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { error: messageError } = await supabase.from("group_messages" as any).insert({
      group_id: groupId,
      user_id: user.id,
      content: "Shared a photo",
      image_url: signedUrlData.signedUrl,
    });

    setUploading(false);

    if (messageError) {
      toast({
        title: "Error",
        description: "Failed to send photo",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Photo uploaded successfully",
    });
  };

  const handleModerateMessage = async (messageId: string, isModerated: boolean) => {
    const { error } = await supabase
      .from("group_messages" as any)
      .update({ is_moderated: !isModerated })
      .eq("id", messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to moderate message",
        variant: "destructive",
      });
      return;
    }

    fetchMessages();
    toast({
      title: "Success",
      description: isModerated ? "Message restored" : "Message moderated",
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("group_messages" as any)
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

    fetchMessages();
    toast({
      title: "Success",
      description: "Message deleted",
    });
  };

  const canModerate = userRole === "admin" || userRole === "moderator";

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{groupName}</CardTitle>
          </div>
          <Badge variant="secondary">{userRole}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${
              message.user_id === currentUserId ? "flex-row-reverse" : ""
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {message.user_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div
              className={`flex flex-col gap-1 max-w-[70%] ${
                message.user_id === currentUserId ? "items-end" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{message.user_name}</span>
                <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
              </div>
              <div
                className={`rounded-lg p-3 ${
                  message.is_moderated
                    ? "bg-destructive/10 border border-destructive"
                    : message.user_id === currentUserId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.is_moderated && (
                  <div className="flex items-center gap-1 text-xs text-destructive mb-2">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Moderated</span>
                  </div>
                )}
                {message.image_url && (
                  <img
                    src={message.image_url}
                    alt="Shared"
                    className="rounded max-w-full h-auto mb-2"
                  />
                )}
                <p className="text-sm break-words">{message.content}</p>
              </div>
              {canModerate && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleModerateMessage(message.id, message.is_moderated)}
                  >
                    {message.is_moderated ? "Restore" : "Moderate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive"
                    onClick={() => handleDeleteMessage(message.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
              {!canModerate && message.user_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-destructive"
                  onClick={() => handleDeleteMessage(message.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={uploading}
          />
          <Button type="submit" size="icon" disabled={uploading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
