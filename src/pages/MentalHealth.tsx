import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Heart, Smile, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const MentalHealth = () => {
  const navigate = useNavigate();

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
                  {["😢", "😕", "😐", "🙂", "😊"].map((emoji, i) => (
                    <Button key={i} variant="outline" className="flex-1 text-2xl">
                      {emoji}
                    </Button>
                  ))}
                </div>
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
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Take 5 deep breaths when feeling overwhelmed</li>
                <li>• Practice gratitude daily</li>
                <li>• Connect with friends or family</li>
                <li>• Take breaks during study sessions</li>
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
