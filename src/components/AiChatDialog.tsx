import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Settings, Sparkles, Paperclip, X, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MessageContent =
  | string
  | Array<{ type: string; text?: string; image_url?: { url: string } }>;

interface Message {
  role: "user" | "assistant";
  content: MessageContent;
}

interface UploadedFile {
  name: string;
  type: string;
  data: string;
  preview?: string;
}

interface AiChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AiChatDialog = ({ open, onOpenChange }: AiChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [provider, setProvider] = useState<"lovable" | "deepseek">("lovable");
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setIsLoadingHistory(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setMessages([]);
          return;
        }
        const { data, error } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          setMessages(
            (data ?? []).map((r) => ({
              role: r.role as "user" | "assistant",
              content: r.content as MessageContent,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        if (!cancelled) {
          toast({
            title: "Couldn't load history",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const persistMessage = async (role: "user" | "assistant", content: MessageContent) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error } = await supabase.from("chat_messages").insert({
        user_id: userData.user.id,
        role,
        content: content as any,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
    let assistantMessage = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          provider,
        }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || "Failed to get response");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantMessage } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantMessage }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (assistantMessage) {
        await persistMessage("assistant", assistantMessage);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 20MB limit`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const data = await readFileAsDataURL(file);
        const uploadedFile: UploadedFile = {
          name: file.name,
          type: file.type,
          data,
        };

        if (file.type.startsWith("image/")) {
          uploadedFile.preview = data;
        }

        newFiles.push(uploadedFile);
      } catch (error) {
        toast({
          title: "Error reading file",
          description: `Failed to read ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearConversation = async () => {
    if (messages.length === 0 || isClearing) return;
    setIsClearing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMessages([]);
        return;
      }
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", userData.user.id);
      if (error) throw error;
      setMessages([]);
    } catch (err) {
      console.error("Failed to clear conversation:", err);
      toast({
        title: "Couldn't clear conversation",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const userMessage = input.trim();
    const files = [...uploadedFiles];

    setInput("");
    setUploadedFiles([]);

    let messageContent: MessageContent;

    if (files.length > 0) {
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

      if (userMessage) {
        contentParts.push({ type: "text", text: userMessage });
      }

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          contentParts.push({
            type: "image_url",
            image_url: { url: file.data },
          });
        } else if (file.type.startsWith("text/")) {
          const textContent = atob(file.data.split(",")[1]);
          contentParts.push({
            type: "text",
            text: `Content of ${file.name}:\n${textContent}`,
          });
        }
      }

      messageContent = contentParts;
    } else {
      messageContent = userMessage;
    }

    setMessages(prev => [...prev, { role: "user", content: messageContent }]);
    setIsLoading(true);

    await persistMessage("user", messageContent);
    await streamChat(userMessage || "Analyze the uploaded file(s)");
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearConversation}
                disabled={messages.length === 0 || isClearing || isLoading}
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {showSettings && (
            <div className="pt-2">
              <Select value={provider} onValueChange={(v) => setProvider(v as "lovable" | "deepseek")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Lovable AI (Google Gemini)
                    </div>
                  </SelectItem>
                  <SelectItem value="deepseek">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      DeepSeek
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Loading history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with the AI assistant</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {typeof msg.content === "string" ? (
                      msg.content
                    ) : (
                      <div className="space-y-2">
                        {msg.content.map((part, partIdx) => (
                          <div key={partIdx}>
                            {part.type === "text" && <p>{part.text}</p>}
                            {part.type === "image_url" && part.image_url && (
                              <img
                                src={part.image_url.url}
                                alt="Uploaded"
                                className="max-w-full rounded"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t space-y-2">
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative flex items-center gap-2 bg-muted rounded-lg p-2 pr-8"
                >
                  {file.preview && (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  )}
                  <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-6 w-6"
                    onClick={() => removeFile(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,text/*"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              disabled={isLoading}
              className="min-h-[60px] resize-none"
              rows={2}
            />
            <Button onClick={handleSend} disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
