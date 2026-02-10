import { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface MCQPrompt {
  question: string;
  options: string[];
}

interface PeerConnectCardProps {
  prompt: MCQPrompt;
  cardIndex: number;
  totalCards: number;
  onSubmit: (selectedOption: number) => void;
  partnerAnswer: number | null;
  myAnswer: number | null;
  spark: string | null;
  waitingForPartner: boolean;
}

export const PeerConnectCard = ({
  prompt,
  cardIndex,
  totalCards,
  onSubmit,
  partnerAnswer,
  myAnswer,
  spark,
  waitingForPartner,
}: PeerConnectCardProps) => {
  const [selected, setSelected] = useState<string>("");
  const hasSubmitted = myAnswer !== null;
  const isRevealed = myAnswer !== null && partnerAnswer !== null;

  const handleSubmit = () => {
    const idx = parseInt(selected);
    if (isNaN(idx)) return;
    onSubmit(idx);
  };

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground mb-2">
        Card {cardIndex + 1} of {totalCards}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="pt-6 space-y-6">
          <h3 className="text-lg font-semibold text-center">{prompt.question}</h3>

          {!hasSubmitted ? (
            <div className="space-y-4">
              <RadioGroup value={selected} onValueChange={setSelected}>
                {prompt.options.map((option, i) => (
                  <div
                    key={i}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selected === String(i)
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setSelected(String(i))}
                  >
                    <RadioGroupItem value={String(i)} id={`option-${i}`} />
                    <Label htmlFor={`option-${i}`} className="cursor-pointer flex-1">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={selected === ""}
              >
                Lock In Answer <Check className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : waitingForPartner ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Waiting for your peer to answer...</p>
              <div className="text-sm">
                You chose: <span className="font-medium">{prompt.options[myAnswer!]}</span>
              </div>
            </div>
          ) : isRevealed ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-center text-muted-foreground">You</p>
                  <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary text-center">
                    <p className="text-sm font-medium">{prompt.options[myAnswer!]}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-center text-muted-foreground">Your Peer</p>
                  <div className="p-3 rounded-lg bg-secondary/20 border-2 border-secondary text-center">
                    <p className="text-sm font-medium">{prompt.options[partnerAnswer!]}</p>
                  </div>
                </div>
              </div>

              {myAnswer === partnerAnswer && (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    ✨ Same answer!
                  </span>
                </div>
              )}

              {spark && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span className="text-muted-foreground italic">{spark}</span>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
