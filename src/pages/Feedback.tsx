import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Star, Loader2, ThumbsUp, Bug, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const feedbackTypes = [
  { id: "general", label: "General", icon: MessageSquare, color: "text-primary" },
  { id: "bug", label: "Bug Report", icon: Bug, color: "text-destructive" },
  { id: "feature", label: "Feature Request", icon: Lightbulb, color: "text-yellow-500" },
  { id: "praise", label: "Praise", icon: ThumbsUp, color: "text-green-500" },
];

const Feedback = () => {
  const navigate = useNavigate();
  const [type, setType] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) { toast.error("Please enter your feedback"); return; }

    setSubmitting(true);
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    
    // Store feedback using mentor_requests table as a general-purpose request table
    const { error } = await supabase.from("mentor_requests").insert({
      user_id: session?.user?.id || null,
      request_type: `feedback_${type}`,
      description: `[Rating: ${rating}/5] [Subject: ${subject || "N/A"}] ${message}`,
    });

    if (error) {
      toast.error("Failed to submit feedback. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);
    toast.success("Thank you for your feedback!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/5 to-secondary/5">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Feedback</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 max-w-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <ThumbsUp className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">Thank You!</h2>
          <p className="text-muted-foreground">
            Your feedback helps us make Stone Path Project better for everyone. We truly appreciate you taking the time to share your thoughts.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setSubmitted(false); setMessage(""); setSubject(""); setRating(0); setType("general"); }}>
              Send More Feedback
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </main>
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
          <h1 className="text-xl font-bold">Feedback</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold">We'd Love to Hear From You</h2>
          <p className="text-muted-foreground text-sm mt-1">Your feedback shapes the future of Stone Path Project</p>
        </div>

        {/* Feedback Type */}
        <Card className="p-6">
          <Label className="mb-3 block">What kind of feedback?</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {feedbackTypes.map((ft) => {
              const Icon = ft.icon;
              return (
                <button
                  key={ft.id}
                  onClick={() => setType(ft.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    type === ft.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${ft.color}`} />
                  <span className="text-xs font-medium">{ft.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Rating */}
        <Card className="p-6">
          <Label className="mb-3 block">How would you rate your experience?</Label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredStar || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              {rating <= 2 ? "We're sorry to hear that. Please tell us more below." : rating <= 4 ? "Thanks! What can we improve?" : "Awesome! We're glad you're enjoying it!"}
            </p>
          )}
        </Card>

        {/* Details */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your feedback" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === "bug" ? "Describe the bug: what happened, what you expected, and steps to reproduce..."
                : type === "feature" ? "Describe the feature you'd like to see and how it would help you..."
                : type === "praise" ? "Tell us what you love about Stone Path Project!"
                : "Share your thoughts, suggestions, or concerns..."
              }
              rows={5}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !message.trim()} className="w-full">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Feedback
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default Feedback;
