import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Heart, Users, Sparkles, Lightbulb, HelpCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const questionSchema = z.object({
  question: z.string()
    .trim()
    .min(10, "Question must be at least 10 characters")
    .max(500, "Question must be less than 500 characters")
});

const Relationships = () => {
  const navigate = useNavigate();
  const [newQuestion, setNewQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user-submitted questions
  const { data: userQuestions = [], refetch } = useQuery({
    queryKey: ['relationship-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relationship_questions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const healthyTips = [
    "Practice active listening - put away distractions and truly focus on what your partner is saying.",
    "Express appreciation daily - small gestures of gratitude strengthen bonds.",
    "Set healthy boundaries - it's okay to have personal space and individual interests.",
    "Communicate your needs clearly - your partner isn't a mind reader.",
    "Resolve conflicts respectfully - avoid personal attacks and focus on the issue.",
    "Quality time matters more than quantity - be present when you're together.",
    "Support each other's growth - celebrate individual achievements and goals.",
  ];

  const tipOfTheDay = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return healthyTips[dayOfYear % healthyTips.length];
  }, []);

  const qAndAs = [
    {
      question: "How do I know if my relationship is healthy?",
      answer: "A healthy relationship includes mutual respect, trust, open communication, equal support, and the freedom to be yourself. Both partners should feel valued and safe expressing their thoughts and feelings."
    },
    {
      question: "What should I do if we argue a lot?",
      answer: "Frequent arguments aren't necessarily bad - it's how you handle them that matters. Focus on resolving conflicts respectfully, listening to each other's perspectives, and finding compromises. If arguments become destructive, consider seeking help from a counselor."
    },
    {
      question: "How can I improve communication with my partner?",
      answer: "Practice active listening, use 'I' statements instead of 'you' accusations, be honest about your feelings, and choose the right time for important conversations. Regular check-ins about how you're both feeling can also help."
    },
    {
      question: "Is it normal to need space in a relationship?",
      answer: "Absolutely! Healthy relationships include time apart. Having your own interests, friendships, and alone time is important for personal growth and actually strengthens your relationship."
    },
    {
      question: "When should I consider ending a relationship?",
      answer: "Consider ending a relationship if there's abuse (physical, emotional, or verbal), constant disrespect, lack of trust, or if you feel consistently unhappy and efforts to improve haven't worked. Your safety and wellbeing come first."
    },
  ];

  // Combine hardcoded and user-submitted questions
  const allQuestions = [
    ...qAndAs,
    ...userQuestions.map(q => ({
      question: q.question,
      answer: q.answer || "This question is awaiting an answer from our team."
    }))
  ];

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return;

    try {
      // Validate input
      questionSchema.parse({ question: newQuestion });
      
      setIsSubmitting(true);
      const { error } = await supabase
        .from('relationship_questions')
        .insert([{ question: newQuestion.trim() }]);

      if (error) throw error;

      toast({
        title: "Question Submitted",
        description: "Your anonymous question has been submitted and will be reviewed.",
      });
      
      setNewQuestion("");
      refetch();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Question",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit question. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-pink-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
            Relationships
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <CardTitle>Relationship Health</CardTitle>
              </div>
              <CardDescription>Understanding healthy relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ Open and honest communication</li>
                <li>✓ Mutual respect and trust</li>
                <li>✓ Supporting each other's goals</li>
                <li>✓ Healthy boundaries</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-pink-500" />
                <CardTitle>Communication Skills</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Active Listening Guide
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Expressing Feelings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Conflict Resolution
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                <CardTitle>Relationship Types</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Romantic Relationships</p>
                  <p className="text-sm text-muted-foreground">Building healthy partnerships</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Family Relationships</p>
                  <p className="text-sm text-muted-foreground">Navigating family dynamics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                <CardTitle>Relationship Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Communicate openly and honestly</li>
                <li>• Respect personal boundaries</li>
                <li>• Show appreciation regularly</li>
                <li>• Work through conflicts together</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Relationship Wellness Section */}
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold">Relationship Wellness</h2>
          
          {/* Healthy Tip of the Day */}
          <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-200 dark:border-pink-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-pink-500" />
                <CardTitle>Healthy Tip of the Day</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg italic">{tipOfTheDay}</p>
            </CardContent>
          </Card>

          {/* Anonymous Q&A Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-pink-500" />
                <CardTitle>Anonymous Q&A</CardTitle>
              </div>
              <CardDescription>Common questions about relationships - you're not alone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submit Question Form */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Ask Your Question Anonymously</h4>
                <Textarea
                  placeholder="Type your relationship question here... (10-500 characters)"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="min-h-[100px]"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {newQuestion.length}/500 characters
                  </span>
                  <Button 
                    onClick={handleSubmitQuestion}
                    disabled={isSubmitting || newQuestion.trim().length < 10}
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Question
                  </Button>
                </div>
              </div>

              {/* Questions Accordion */}
              <Accordion type="single" collapsible className="w-full">
                {allQuestions.map((qa, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {qa.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {qa.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Relationships;
