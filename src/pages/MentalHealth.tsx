import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Heart, Smile, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Mood = "very_sad" | "sad" | "neutral" | "happy" | "very_happy" | null;

const moodData = {
  very_sad: {
    emoji: "😢",
    advice: "It's okay to feel down. Remember, tough times don't last, but tough people do. You're stronger than you think.",
    quote: "The darkest nights produce the brightest stars. - John Green",
    tips: [
      "• Reach out to a friend or family member",
      "• Try journaling your feelings",
      "• Take a gentle walk outside",
      "• Practice self-compassion"
    ],
    ttsMessage: "I understand you're feeling down right now. Remember, it's okay not to be okay. Take a deep breath. You are not alone, and this feeling will pass. Be gentle with yourself today."
  },
  sad: {
    emoji: "😕",
    advice: "Everyone has difficult days. This feeling is temporary, and brighter days are ahead. Be kind to yourself.",
    quote: "Every storm runs out of rain. - Maya Angelou",
    tips: [
      "• Listen to uplifting music",
      "• Connect with someone who cares",
      "• Do something creative",
      "• Practice mindfulness"
    ],
    ttsMessage: "I hear you. It's been a tough day. Remember to breathe deeply and take things one moment at a time. You have the strength to get through this."
  },
  neutral: {
    emoji: "😐",
    advice: "Balance is important. Use this steady moment to reflect and recharge for what's ahead.",
    quote: "In the middle of difficulty lies opportunity. - Albert Einstein",
    tips: [
      "• Set small achievable goals",
      "• Practice gratitude",
      "• Try a new hobby or activity",
      "• Maintain healthy routines"
    ],
    ttsMessage: "You're in a calm, balanced space right now. This is a great time to pause, reflect, and set intentions for the days ahead. Stay centered."
  },
  happy: {
    emoji: "🙂",
    advice: "Your positive energy is wonderful! Keep nurturing what makes you feel good and share your light with others.",
    quote: "Happiness is not something ready made. It comes from your own actions. - Dalai Lama",
    tips: [
      "• Share your joy with others",
      "• Celebrate small wins",
      "• Try something new today",
      "• Practice acts of kindness"
    ],
    ttsMessage: "It's beautiful to see you feeling good today. Keep nurturing this positive energy. Share your smile with the world and celebrate this moment."
  },
  very_happy: {
    emoji: "😊",
    advice: "Your joy is contagious! Embrace this wonderful feeling and let it fuel your passions and connections.",
    quote: "Joy is the simplest form of gratitude. - Karl Barth",
    tips: [
      "• Express gratitude for this moment",
      "• Inspire others with your energy",
      "• Document this happy memory",
      "• Plan something exciting"
    ],
    ttsMessage: "Your happiness is radiating! This is wonderful. Take a moment to appreciate this feeling and all the good things in your life. You deserve this joy."
  }
};

const MentalHealth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<Mood>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleMoodSelection = async (mood: Mood) => {
    setSelectedMood(mood);
    
    if (!mood) return;
    
    const moodInfo = moodData[mood];
    
    toast({
      title: "Mood Recorded",
      description: "Generating personalized audio message...",
    });

    setIsPlayingAudio(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('mood-tts', {
        body: { text: moodInfo.ttsMessage, voice: 'nova' }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          setIsPlayingAudio(false);
          toast({
            title: "Audio Error",
            description: "Failed to play audio message",
            variant: "destructive",
          });
        };
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing mood audio:', error);
      setIsPlayingAudio(false);
      toast({
        title: "Error",
        description: "Failed to generate audio message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
            Mental Health
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <CardTitle>Daily Mood Check</CardTitle>
              </div>
              <CardDescription>Track how you're feeling today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between gap-2">
                  {(["very_sad", "sad", "neutral", "happy", "very_happy"] as Mood[]).map((mood) => (
                    <Button 
                      key={mood} 
                      variant={selectedMood === mood ? "default" : "outline"} 
                      className="flex-1 text-2xl"
                      onClick={() => handleMoodSelection(mood)}
                      disabled={isPlayingAudio}
                    >
                      {moodData[mood!].emoji}
                    </Button>
                  ))}
                </div>
                {selectedMood && (
                  <div className="mt-4 p-4 bg-purple-500/10 rounded-lg space-y-2">
                    <p className="text-sm font-semibold">{moodData[selectedMood].advice}</p>
                    <p className="text-xs italic text-muted-foreground">"{moodData[selectedMood].quote}"</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-purple-500" />
                <CardTitle>Wellness Score</CardTitle>
              </div>
              <CardDescription>Your overall mental wellness this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Score</span>
                  <span className="font-bold">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-purple-500" />
                <CardTitle>Quick Tips</CardTitle>
              </div>
              <CardDescription>
                {selectedMood ? "Based on your current mood" : "Select a mood to see personalized tips"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {selectedMood ? (
                  moodData[selectedMood].tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))
                ) : (
                  <>
                    <li>• Take 5 deep breaths when feeling overwhelmed</li>
                    <li>• Practice gratitude daily</li>
                    <li>• Connect with friends or family</li>
                    <li>• Take breaks during study sessions</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-purple-500" />
                <CardTitle>Relaxation Exercises</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  5-Minute Meditation
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Breathing Exercise
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Progressive Muscle Relaxation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MentalHealth;
