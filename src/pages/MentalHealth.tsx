import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Heart, Smile, Moon, ChevronDown, Play, Pause, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import meditationAudio from "@/assets/meditation-music.mp3";

type Mood = "very_sad" | "sad" | "neutral" | "happy" | "very_happy" | null;
type ZodiacSign = "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces" | null;
type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal" | null;

const zodiacInsights = {
  aries: { emoji: "♈", insight: "Your energy is high today. Channel it into productive activities and self-care routines.", affirmation: "I am bold and capable of handling any challenge." },
  taurus: { emoji: "♉", insight: "Focus on grounding activities. Nature walks and comfort foods will bring you peace.", affirmation: "I am stable and secure in who I am." },
  gemini: { emoji: "♊", insight: "Communication is key today. Express your feelings and connect with loved ones.", affirmation: "I embrace change and adapt with ease." },
  cancer: { emoji: "♋", insight: "Nurture yourself as you nurture others. Self-compassion is your superpower.", affirmation: "I honor my emotions and care for myself deeply." },
  leo: { emoji: "♌", insight: "Your creativity shines bright. Express yourself through art, movement, or journaling.", affirmation: "I radiate confidence and positive energy." },
  virgo: { emoji: "♍", insight: "Organization brings you calm. Create structure in your day while being gentle with yourself.", affirmation: "I accept myself exactly as I am." },
  libra: { emoji: "♎", insight: "Balance is essential. Take time for both social connection and solitude.", affirmation: "I create harmony in my life and relationships." },
  scorpio: { emoji: "♏", insight: "Deep reflection serves you well. Honor your intensity and emotional depth.", affirmation: "I embrace transformation and personal growth." },
  sagittarius: { emoji: "♐", insight: "Adventure awaits! Try something new today, even if it's small.", affirmation: "I am free to explore and grow." },
  capricorn: { emoji: "♑", insight: "Your dedication is admirable. Remember to rest and celebrate your progress.", affirmation: "I am worthy of rest and success." },
  aquarius: { emoji: "♒", insight: "Your unique perspective is valuable. Share your thoughts with those who matter.", affirmation: "I honor my individuality and authenticity." },
  pisces: { emoji: "♓", insight: "Your intuition is strong. Trust your feelings and practice creative expression.", affirmation: "I trust my inner wisdom and intuition." }
};

const cyclePhases = {
  menstrual: { 
    phase: "Menstrual Phase", 
    description: "Days 1-5: Your body is shedding. Rest is crucial.",
    tips: ["• Rest and prioritize sleep", "• Practice gentle yoga or stretching", "• Stay hydrated and eat iron-rich foods", "• Be extra gentle with yourself"],
    moodSupport: "It's normal to feel low energy. Honor this need for rest."
  },
  follicular: { 
    phase: "Follicular Phase", 
    description: "Days 6-14: Energy is building. Great time for new activities.",
    tips: ["• Try new exercises or activities", "• Socialize and connect with friends", "• Take on challenging tasks", "• Plan and start new projects"],
    moodSupport: "Your mood and energy are naturally rising. Embrace this positive phase!"
  },
  ovulation: { 
    phase: "Ovulation Phase", 
    description: "Days 15-17: Peak energy and confidence.",
    tips: ["• Schedule important meetings or events", "• Engage in high-intensity workouts", "• Express yourself creatively", "• Enjoy social activities"],
    moodSupport: "You're in your power! Your confidence and communication skills are at their peak."
  },
  luteal: { 
    phase: "Luteal Phase", 
    description: "Days 18-28: Energy gradually decreases. Focus inward.",
    tips: ["• Practice self-care routines", "• Reduce caffeine and sugar", "• Do calming activities like reading", "• Prepare for menstruation"],
    moodSupport: "PMS symptoms may appear. Be patient with yourself and practice extra self-compassion."
  }
};

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [zodiacSign, setZodiacSign] = useState<ZodiacSign>(null);
  const [cyclePhase, setCyclePhase] = useState<CyclePhase>(null);

  useEffect(() => {
    const savedZodiac = localStorage.getItem('zodiacSign') as ZodiacSign;
    const savedCycle = localStorage.getItem('cyclePhase') as CyclePhase;
    if (savedZodiac) setZodiacSign(savedZodiac);
    if (savedCycle) setCyclePhase(savedCycle);
  }, []);

  const handleMoodSelection = (mood: Mood) => {
    setSelectedMood(mood);
    
    if (!mood) return;
    
    toast({
      title: "Mood Recorded",
      description: "Your personalized tips are ready!",
    });
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlayingAudio(!isPlayingAudio);
  };

  const handleZodiacChange = (sign: ZodiacSign) => {
    setZodiacSign(sign);
    localStorage.setItem('zodiacSign', sign || '');
    toast({
      title: "Zodiac Sign Saved",
      description: "Your personalized insights are ready!",
    });
  };

  const handleCycleChange = (phase: CyclePhase) => {
    setCyclePhase(phase);
    localStorage.setItem('cyclePhase', phase || '');
    toast({
      title: "Cycle Phase Updated",
      description: "Your wellness tips have been updated!",
    });
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
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      5-Minute Meditation
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-purple-500/5 rounded-lg text-sm space-y-3">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Find a quiet, comfortable spot</li>
                      <li>Close your eyes and breathe naturally</li>
                      <li>Focus on your breath - in and out</li>
                      <li>When your mind wanders, gently return focus</li>
                      <li>Continue for 5 minutes</li>
                    </ol>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={toggleAudio}
                        className="gap-2"
                      >
                        {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isPlayingAudio ? "Pause" : "Play"} Meditation Music
                      </Button>
                    </div>
                    <audio 
                      ref={audioRef} 
                      src={meditationAudio}
                      onEnded={() => setIsPlayingAudio(false)}
                    />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      Breathing Exercise
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-purple-500/5 rounded-lg text-sm">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Breathe in slowly through your nose for 4 counts</li>
                      <li>Hold your breath for 4 counts</li>
                      <li>Exhale slowly through your mouth for 6 counts</li>
                      <li>Pause for 2 counts</li>
                      <li>Repeat 5-10 times</li>
                    </ol>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      Progressive Muscle Relaxation
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-purple-500/5 rounded-lg text-sm">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Tense your feet for 5 seconds, then release</li>
                      <li>Move up to your legs, then stomach</li>
                      <li>Continue with chest, arms, and hands</li>
                      <li>Finally, tense and release your face muscles</li>
                      <li>Notice the difference between tension and relaxation</li>
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <CardTitle>Zodiac Wellness</CardTitle>
              </div>
              <CardDescription>Personalized insights based on your sign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={zodiacSign || ""} onValueChange={handleZodiacChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your zodiac sign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aries">♈ Aries</SelectItem>
                    <SelectItem value="taurus">♉ Taurus</SelectItem>
                    <SelectItem value="gemini">♊ Gemini</SelectItem>
                    <SelectItem value="cancer">♋ Cancer</SelectItem>
                    <SelectItem value="leo">♌ Leo</SelectItem>
                    <SelectItem value="virgo">♍ Virgo</SelectItem>
                    <SelectItem value="libra">♎ Libra</SelectItem>
                    <SelectItem value="scorpio">♏ Scorpio</SelectItem>
                    <SelectItem value="sagittarius">♐ Sagittarius</SelectItem>
                    <SelectItem value="capricorn">♑ Capricorn</SelectItem>
                    <SelectItem value="aquarius">♒ Aquarius</SelectItem>
                    <SelectItem value="pisces">♓ Pisces</SelectItem>
                  </SelectContent>
                </Select>
                {zodiacSign && (
                  <div className="p-4 bg-purple-500/10 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{zodiacInsights[zodiacSign].emoji}</span>
                      <h3 className="font-semibold capitalize">{zodiacSign}</h3>
                    </div>
                    <p className="text-sm">{zodiacInsights[zodiacSign].insight}</p>
                    <div className="pt-2 border-t border-purple-500/20">
                      <p className="text-xs font-medium text-muted-foreground">Daily Affirmation:</p>
                      <p className="text-sm italic">"{zodiacInsights[zodiacSign].affirmation}"</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <CardTitle>Cycle Wellness</CardTitle>
              </div>
              <CardDescription>Track your cycle for better mental health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={cyclePhase || ""} onValueChange={handleCycleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select current cycle phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menstrual">🩸 Menstrual (Days 1-5)</SelectItem>
                    <SelectItem value="follicular">🌱 Follicular (Days 6-14)</SelectItem>
                    <SelectItem value="ovulation">✨ Ovulation (Days 15-17)</SelectItem>
                    <SelectItem value="luteal">🌙 Luteal (Days 18-28)</SelectItem>
                  </SelectContent>
                </Select>
                {cyclePhase && (
                  <div className="p-4 bg-purple-500/10 rounded-lg space-y-3">
                    <h3 className="font-semibold">{cyclePhases[cyclePhase].phase}</h3>
                    <p className="text-xs text-muted-foreground">{cyclePhases[cyclePhase].description}</p>
                    <div className="pt-2 border-t border-purple-500/20">
                      <p className="text-xs font-medium mb-2">Wellness Tips:</p>
                      <ul className="text-sm space-y-1">
                        {cyclePhases[cyclePhase].tips.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-purple-500/20">
                      <p className="text-xs font-medium text-muted-foreground">Mood Support:</p>
                      <p className="text-sm italic">{cyclePhases[cyclePhase].moodSupport}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MentalHealth;
