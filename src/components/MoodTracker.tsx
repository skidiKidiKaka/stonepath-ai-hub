import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

type MoodLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Step = "slider" | "feelings" | "impact";

const moodLabels = [
  "Very Unpleasant",
  "Unpleasant", 
  "Slightly Unpleasant",
  "Neutral",
  "Slightly Pleasant",
  "Pleasant",
  "Very Pleasant"
];

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
  const { toast } = useToast();

  const handleSliderChange = (value: number[]) => {
    setMoodLevel(value[0] as MoodLevel);
  };

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

  const handleNext = () => {
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
      const tips = getTipsBySelection(moodLevel, selectedFeelings, selectedImpacts);
      onComplete(moodLevel, selectedFeelings, selectedImpacts, tips);
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

  const getFlowerColor = () => {
    const colors = [
      "from-red-900/20 to-purple-900/20", // Very Unpleasant
      "from-red-700/30 to-purple-800/30", // Unpleasant
      "from-orange-600/40 to-purple-700/40", // Slightly Unpleasant
      "from-purple-500/50 to-purple-600/50", // Neutral
      "from-purple-400/60 to-blue-500/60", // Slightly Pleasant
      "from-blue-400/70 to-green-500/70", // Pleasant
      "from-green-400/80 to-yellow-400/80" // Very Pleasant
    ];
    return colors[moodLevel];
  };

  const getFlowerScale = () => {
    return 0.7 + (moodLevel * 0.05);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white p-6">
        {step === "slider" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-slate-300">Mood</h2>
              <h3 className="text-xl font-bold">Choose how you felt overall that day</h3>
            </div>

            <div className="flex justify-center py-4">
              <div 
                className={`w-32 h-32 rounded-full bg-gradient-to-br ${getFlowerColor()} transition-all duration-500 flex items-center justify-center`}
                style={{ transform: `scale(${getFlowerScale()})` }}
              >
                <div className="text-5xl animate-pulse">🌸</div>
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-xl font-bold mb-2">{moodLabels[moodLevel]}</h4>
            </div>

            <div className="space-y-3 px-4">
              <Slider
                value={[moodLevel]}
                onValueChange={handleSliderChange}
                max={6}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400 uppercase">
                <span>Very Unpleasant</span>
                <span>Very Pleasant</span>
              </div>
            </div>

            <Button 
              onClick={handleNext} 
              className="w-full py-5 text-base bg-purple-600 hover:bg-purple-700"
            >
              Next
            </Button>
          </div>
        )}

        {step === "feelings" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-3xl">🌸</div>
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
              <div className="text-3xl">🌸</div>
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
              className="w-full py-5 text-base bg-purple-600 hover:bg-purple-700"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
