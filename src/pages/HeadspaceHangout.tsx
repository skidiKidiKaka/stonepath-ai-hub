import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, BookOpen, Users, Heart, Briefcase, DollarSign, MessageCircle, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PCTSession } from "@/components/PCTSession";
import { PCTStats } from "@/components/PCTStats";

const pillars = [
  { id: "mental-health", name: "Mental Health", icon: Brain, color: "from-purple-500 to-purple-600", topics: ["Managing Anxiety", "Building Self-Esteem", "Dealing with Stress", "Emotional Awareness"] },
  { id: "academics", name: "Academics", icon: BookOpen, color: "from-blue-500 to-blue-600", topics: ["Study Motivation", "Test Anxiety", "Time Management", "Academic Pressure"] },
  { id: "friendships", name: "Friendships", icon: Users, color: "from-green-500 to-green-600", topics: ["Making New Friends", "Handling Conflict", "Peer Pressure", "Being a Good Friend"] },
  { id: "relationships", name: "Relationships", icon: MessageCircle, color: "from-pink-500 to-pink-600", topics: ["Healthy Boundaries", "Communication Skills", "Understanding Feelings", "Family Dynamics"] },
  { id: "bullying", name: "Peer Support", icon: Shield, color: "from-cyan-500 to-cyan-600", topics: ["Standing Up for Others", "Cyberbullying", "Building Resilience", "Seeking Help"] },
  { id: "fitness", name: "Fitness & Wellness", icon: Heart, color: "from-red-500 to-red-600", topics: ["Body Image", "Healthy Habits", "Sleep Hygiene", "Mindful Movement"] },
  { id: "career", name: "Career", icon: Briefcase, color: "from-orange-500 to-orange-600", topics: ["Finding Your Passion", "Goal Setting", "Dealing with Uncertainty", "Exploring Interests"] },
  { id: "finance", name: "Finance", icon: DollarSign, color: "from-emerald-500 to-emerald-600", topics: ["Money Mindset", "Saving Goals", "Financial Stress", "Smart Spending"] },
];

type View = "pillars" | "topics" | "session";

const HeadspaceHangout = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("pillars");
  const [selectedPillar, setSelectedPillar] = useState<typeof pillars[0] | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  const handlePillarSelect = (pillar: typeof pillars[0]) => {
    setSelectedPillar(pillar);
    setView("topics");
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setView("session");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/5 to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              if (view === "session") setView("topics");
              else if (view === "topics") setView("pillars");
              else navigate("/dashboard");
            }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Headspace Hangout
              </h1>
              <p className="text-sm text-muted-foreground">Guided reflection & self-discovery</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {view === "pillars" && (
          <div className="space-y-8">
            <PCTStats />

            <div>
              <h2 className="text-xl font-bold mb-4">Choose a Pillar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <Card
                      key={pillar.id}
                      className="p-6 cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col items-center gap-3"
                      onClick={() => handlePillarSelect(pillar)}
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${pillar.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="font-semibold text-center">{pillar.name}</span>
                      <span className="text-xs text-muted-foreground">{pillar.topics.length} topics</span>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === "topics" && selectedPillar && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${selectedPillar.color} flex items-center justify-center mx-auto mb-3`}>
                <selectedPillar.icon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold">{selectedPillar.name}</h2>
              <p className="text-muted-foreground">Choose a topic to reflect on</p>
            </div>

            <div className="grid gap-3">
              {selectedPillar.topics.map((topic) => (
                <Card
                  key={topic}
                  className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => handleTopicSelect(topic)}
                >
                  <CardContent className="p-0 flex items-center justify-between">
                    <span className="font-medium">{topic}</span>
                    <Sparkles className="w-4 h-4 text-primary" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {view === "session" && selectedPillar && (
          <PCTSession
            pillar={selectedPillar.name}
            topic={selectedTopic}
            onComplete={() => { setView("pillars"); setSelectedPillar(null); }}
            onBack={() => setView("topics")}
          />
        )}
      </main>
    </div>
  );
};

export default HeadspaceHangout;
