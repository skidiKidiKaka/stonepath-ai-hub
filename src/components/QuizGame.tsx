import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Trophy, Loader2, Sparkles, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  imageUrl?: string;
}

const categories = [
  "Technology & Programming",
  "History & Culture",
  "Science & Nature",
  "Business & Marketing",
  "Arts & Entertainment",
  "Sports & Fitness",
  "Geography & Travel",
  "Food & Cooking",
];

const difficultyColors = {
  easy: "bg-green-500",
  medium: "bg-yellow-500",
  hard: "bg-red-500",
};

export const QuizGame = () => {
  const [category, setCategory] = useState("");
  const [provider, setProvider] = useState<"lovable" | "deepseek">("lovable");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const { toast } = useToast();

  const generateQuiz = async () => {
    if (!category) {
      toast({
        title: "Select a category",
        description: "Please choose a quiz category first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setQuestions([]);
    setCurrentQuestion(0);
    setScore(0);
    setQuizComplete(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { category, provider },
      });

      if (error) throw error;

      const generatedQuestions = data.quiz.questions;
      
      // Generate an image for the first question
      setIsGeneratingImage(true);
      try {
        const imagePrompt = `Create a simple, colorful icon or illustration representing: ${generatedQuestions[0].question}. Style: minimal, professional, educational.`;
        const { data: imageData } = await supabase.functions.invoke("generate-quiz-image", {
          body: { prompt: imagePrompt },
        });
        
        if (imageData?.imageUrl) {
          generatedQuestions[0].imageUrl = imageData.imageUrl;
        }
      } catch (imgError) {
        console.error("Image generation failed:", imgError);
      }
      setIsGeneratingImage(false);

      setQuestions(generatedQuestions);
      
      toast({
        title: "Quiz ready!",
        description: `${generatedQuestions.length} questions loaded`,
      });
    } catch (error) {
      console.error("Quiz generation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate quiz",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (showExplanation) return;
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    if (answerIndex === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
      toast({
        title: "Correct! 🎉",
        description: questions[currentQuestion].explanation,
      });
    } else {
      toast({
        title: "Not quite!",
        description: questions[currentQuestion].explanation,
        variant: "destructive",
      });
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizComplete(false);
    setCategory("");
  };

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Card className="p-8 text-center space-y-6">
        <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
        <div>
          <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
          <p className="text-4xl font-bold text-primary mb-4">
            {score} / {questions.length}
          </p>
          <Badge className={`text-lg ${percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}>
            {percentage}% Correct
          </Badge>
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            {percentage >= 80 ? "Excellent work! You're a quiz master! 🌟" :
             percentage >= 60 ? "Good job! Keep learning! 📚" :
             "Keep practicing! You'll do better next time! 💪"}
          </p>
        </div>
        <Button onClick={resetQuiz} className="w-full">
          Take Another Quiz
        </Button>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-bold">Fun Quiz Challenge</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Choose a Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select quiz category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">AI Provider</label>
            <Select value={provider} onValueChange={(v) => setProvider(v as "lovable" | "deepseek")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Lovable AI (Recommended)
                  </div>
                </SelectItem>
                <SelectItem value="deepseek">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    DeepSeek
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={generateQuiz} 
            disabled={!category || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              "Start Quiz"
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Question {currentQuestion + 1} / {questions.length}
          </Badge>
          <Badge className={difficultyColors[question.difficulty]}>
            {question.difficulty}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-lg">{score}</span>
        </div>
      </div>

      {isGeneratingImage ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : question.imageUrl && (
        <div className="flex justify-center">
          <img 
            src={question.imageUrl} 
            alt="Quiz illustration" 
            className="max-w-full h-48 object-contain rounded-lg"
          />
        </div>
      )}

      <div>
        <h4 className="text-lg font-semibold mb-4">{question.question}</h4>
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === question.correctAnswer;
            const showResult = showExplanation;

            return (
              <Button
                key={index}
                variant="outline"
                className={`w-full justify-start text-left h-auto py-3 px-4 ${
                  showResult
                    ? isCorrect
                      ? "bg-green-500/20 border-green-500"
                      : isSelected
                      ? "bg-red-500/20 border-red-500"
                      : ""
                    : isSelected
                    ? "bg-primary/20 border-primary"
                    : ""
                }`}
                onClick={() => handleAnswer(index)}
                disabled={showExplanation}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                {option}
              </Button>
            );
          })}
        </div>
      </div>

      {showExplanation && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Explanation:</p>
          <p className="text-sm">{question.explanation}</p>
        </div>
      )}

      {showExplanation && (
        <Button onClick={nextQuestion} className="w-full">
          {currentQuestion + 1 < questions.length ? "Next Question" : "See Results"}
        </Button>
      )}
    </Card>
  );
};
