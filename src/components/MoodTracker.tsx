import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type MoodLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Step = "slider" | "feelings" | "impact";

const moodData = [
  { emoji: "😢", label: "Very Unpleasant", color: "from-red-500 to-red-600" },
  { emoji: "😟", label: "Unpleasant", color: "from-orange-500 to-orange-600" },
  { emoji: "😕", label: "Slightly Unpleasant", color: "from-yellow-500 to-yellow-600" },
  { emoji: "😐", label: "Neutral", color: "from-slate-400 to-slate-500" },
  { emoji: "🙂", label: "Slightly Pleasant", color: "from-blue-400 to-blue-500" },
  { emoji: "😊", label: "Pleasant", color: "from-green-400 to-green-500" },
  { emoji: "😄", label: "Very Pleasant", color: "from-emerald-400 to-emerald-500" }
];

const moodLabels = moodData.map(m => m.label);

const feelingsByMood = {
  0: ["Angry", "Anxious", "Scared", "Overwhelmed", "Ashamed", "Disgusted", "Embarrassed", "Frustrated", "Annoyed", "Jealous", "Stressed", "Worried", "Guilty", "Surprised", "Hopeless", "Irritated", "Lonely", "Discouraged", "Disappointed", "Drained", "Sad"],
  1: ["Frustrated", "Worried", "Stressed", "Disappointed", "Lonely", "Tired", "Overwhelmed", "Anxious", "Sad", "Discouraged", "Irritated", "Guilty"],
  2: ["Uncertain", "Tired", "Stressed", "Restless", "Disappointed", "Concerned", "Uneasy", "Hesitant"],
  3: ["Calm", "Balanced", "Steady", "Peaceful", "Centered", "OK", "Fine", "Content"],
  4: ["Content", "Peaceful", "Hopeful", "Pleased", "Satisfied", "Comfortable", "Optimistic", "Grateful"],
  5: ["Happy", "Grateful", "Joyful", "Excited", "Confident", "Proud", "Amused", "Inspired", "Energized", "Delighted"],
  6: ["Amazed", "Excited", "Surprised", "Passionate", "Happy", "Brave", "Proud", "Confident", "Amused", "Calm", "Joyful", "Grateful", "Inspired", "Energized", "Ecstatic", "Thrilled", "Elated"]
};

const impactFactors = [
  "Health", "Fitness", "Self-Care", "Hobbies", "Identity", "Spirituality",
  "Community", "Family", "Friends", "Partner", "Dating",
  "Tasks", "Work", "Education", "Travel", "Weather", "Current Events", "Money"
];

const getTipsBySelection = (mood: MoodLevel, feelings: string[], impacts: string[]) => {
  const tips: string[] = [];
  
  // Mood-based tips
  if (mood <= 2) {
    tips.push("• Practice deep breathing exercises for 5 minutes");
    tips.push("• Reach out to a trusted friend or family member");
    tips.push("• Try journaling to process your emotions");
    tips.push("• Take a gentle walk outside if possible");
  } else if (mood === 3) {
    tips.push("• Maintain your current routines");
    tips.push("• Practice gratitude for small things");
    tips.push("• Set a small achievable goal for today");
  } else {
    tips.push("• Share your positive energy with others");
    tips.push("• Document this moment in a journal");
    tips.push("• Try something new or creative");
    tips.push("• Express gratitude to someone you care about");
  }

  // Feeling-based tips
  if (feelings.includes("Stressed") || feelings.includes("Overwhelmed") || feelings.includes("Anxious")) {
    tips.push("• Try the 4-7-8 breathing technique");
    tips.push("• Break tasks into smaller, manageable steps");
  }
  if (feelings.includes("Lonely") || feelings.includes("Sad")) {
    tips.push("• Connect with someone who understands you");
    tips.push("• Engage in activities that bring you comfort");
  }
  if (feelings.includes("Excited") || feelings.includes("Happy") || feelings.includes("Joyful")) {
    tips.push("• Celebrate this moment mindfully");
    tips.push("• Plan activities that continue this positive momentum");
  }

  // Impact-based tips
  if (impacts.includes("Work") || impacts.includes("Education")) {
    tips.push("• Take regular breaks to maintain balance");
    tips.push("• Set clear boundaries between work and personal time");
  }
  if (impacts.includes("Health") || impacts.includes("Fitness")) {
    tips.push("• Prioritize rest and recovery");
    tips.push("• Listen to your body's needs");
  }
  if (impacts.includes("Family") || impacts.includes("Friends") || impacts.includes("Partner")) {
    tips.push("• Practice open and honest communication");
    tips.push("• Set aside quality time for meaningful connections");
  }

  return tips;
};

interface MoodTrackerProps {
  open: boolean;
  onClose: () => void;
  onComplete: (mood: MoodLevel, feelings: string[], impacts: string[], tips: string[]) => void;
}

export const MoodTracker = ({ open, onClose, onComplete }: MoodTrackerProps) => {
  const [step, setStep] = useState<Step>("slider");
  const [moodLevel, setMoodLevel] = useState<MoodLevel>(3);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>([]);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const { toast } = useToast();

  const toggleFeeling = (feeling: string) => {
    setSelectedFeelings(prev => 
      prev.includes(feeling) 
        ? prev.filter(f => f !== feeling)
        : [...prev, feeling]
    );
  };

  const toggleImpact = (impact: string) => {
    setSelectedImpacts(prev => 
      prev.includes(impact) 
        ? prev.filter(i => i !== impact)
        : [...prev, impact]
    );
  };

  const handleNext = async () => {
    if (step === "slider") {
      setStep("feelings");
    } else if (step === "feelings") {
      if (selectedFeelings.length === 0) {
        toast({
          title: "Please select at least one feeling",
          variant: "destructive"
        });
        return;
      }
      setStep("impact");
    } else {
      if (selectedImpacts.length === 0) {
        toast({
          title: "Please select at least one impact factor",
          variant: "destructive"
        });
        return;
      }
      
      setIsGeneratingTips(true);
      
      // Save mood entry to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("mood_entries")
          .insert({
            user_id: user.id,
            mood_level: moodLevel,
            feelings: selectedFeelings,
            impact_factors: selectedImpacts
          });

        if (error) {
          console.error("Error saving mood entry:", error);
          toast({
            title: "Failed to save mood entry",
            variant: "destructive"
          });
          setIsGeneratingTips(false);
          return;
        }
      }
      
      // Generate personalized AI tips
      try {
        const { data: tipsData, error: tipsError } = await supabase.functions.invoke('generate-mood-tips', {
          body: { 
            moodLevel, 
            feelings: selectedFeelings, 
            impacts: selectedImpacts 
          }
        });

        if (tipsError) {
          console.error("Error generating tips:", tipsError);
          // Fallback to static tips if AI fails
          const tips = getTipsBySelection(moodLevel, selectedFeelings, selectedImpacts);
          toast({
            title: "Mood logged successfully!",
            description: "Using standard wellness tips."
          });
          onComplete(moodLevel, selectedFeelings, selectedImpacts, tips);
        } else {
          toast({
            title: "Mood logged successfully!",
            description: "Your personalized wellness tips are ready."
          });
          onComplete(moodLevel, selectedFeelings, selectedImpacts, tipsData.tips);
        }
      } catch (error) {
        console.error("Error generating tips:", error);
        // Fallback to static tips
        const tips = getTipsBySelection(moodLevel, selectedFeelings, selectedImpacts);
        toast({
          title: "Mood logged successfully!",
          description: "Using standard wellness tips."
        });
        onComplete(moodLevel, selectedFeelings, selectedImpacts, tips);
      } finally {
        setIsGeneratingTips(false);
      }
      
      handleClose();
    }
  };

  const handleClose = () => {
    setStep("slider");
    setMoodLevel(3);
    setSelectedFeelings([]);
    setSelectedImpacts([]);
    onClose();
  };

  const handleMoodSelect = (level: MoodLevel) => {
    setMoodLevel(level);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white p-6">
        {step === "slider" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-slate-300">Mood Check-In</h2>
              <h3 className="text-xl font-bold">How are you feeling today?</h3>
            </div>

            <div className="grid grid-cols-4 gap-3 px-2">
              {moodData.map((mood, index) => {
                const level = index as MoodLevel;
                const isSelected = moodLevel === level;
                
                return (
                  <button
                    key={level}
                    onClick={() => handleMoodSelect(level)}
                    className={`
                      relative flex flex-col items-center justify-center p-4 rounded-2xl
                      transition-all duration-300 hover:scale-105 active:scale-95
                      ${isSelected 
                        ? `bg-gradient-to-br ${mood.color} shadow-lg scale-105 ring-2 ring-white/50` 
                        : 'bg-slate-700/50 hover:bg-slate-600/50'
                      }
                      ${index >= 4 ? 'col-start-auto' : ''}
                    `}
                  >
                    <span className={`text-4xl mb-2 transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
                      {mood.emoji}
                    </span>
                    <span className={`text-xs font-medium text-center transition-all duration-300 ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}>
                      {mood.label}
                    </span>
                    {isSelected && (
                      <div className="absolute inset-0 rounded-2xl bg-white/10 animate-pulse pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <p className="text-sm text-slate-400">Tap an emoji to select your mood</p>
            </div>

            <Button 
              onClick={handleNext} 
              className="w-full py-5 text-base bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg"
            >
              Next
            </Button>
          </div>
        )}

        {step === "feelings" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">{moodData[moodLevel].emoji}</div>
              <h3 className="text-xl font-bold">{moodLabels[moodLevel]}</h3>
              <p className="text-base text-slate-300">What best describes this feeling?</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-h-60 overflow-y-auto p-2">
              {feelingsByMood[moodLevel].map((feeling) => (
                <Button
                  key={feeling}
                  variant={selectedFeelings.includes(feeling) ? "default" : "outline"}
                  onClick={() => toggleFeeling(feeling)}
                  className={`rounded-full text-sm py-1 px-3 ${
                    selectedFeelings.includes(feeling)
                      ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600"
                  }`}
                >
                  {feeling}
                </Button>
              ))}
            </div>

            <Button 
              onClick={handleNext} 
              className="w-full py-5 text-base bg-purple-600 hover:bg-purple-700"
            >
              Next
            </Button>
          </div>
        )}

        {step === "impact" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">{moodData[moodLevel].emoji}</div>
              <h3 className="text-xl font-bold">{moodLabels[moodLevel]}</h3>
              <p className="text-sm text-slate-300">
                {selectedFeelings.join(", ")}
              </p>
              <p className="text-base text-slate-300 font-semibold mt-2">
                What's having the biggest impact on you?
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-h-52 overflow-y-auto p-2">
              {impactFactors.map((impact) => (
                <Button
                  key={impact}
                  variant={selectedImpacts.includes(impact) ? "default" : "outline"}
                  onClick={() => toggleImpact(impact)}
                  className={`rounded-full text-sm py-1 px-3 ${
                    selectedImpacts.includes(impact)
                      ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600"
                  }`}
                >
                  {impact}
                </Button>
              ))}
            </div>

            <Button 
              onClick={handleNext}
              disabled={isGeneratingTips}
              className="w-full py-5 text-base bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg disabled:opacity-50"
            >
              {isGeneratingTips ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating personalized tips...
                </span>
              ) : (
                "Done"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
