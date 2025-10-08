import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Activity, Target, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Fitness = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-red-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
            Fitness
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                <CardTitle>Daily Goals</CardTitle>
              </div>
              <CardDescription>Track your fitness progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Steps</span>
                    <span>6,500 / 10,000</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Minutes</span>
                    <span>25 / 30</span>
                  </div>
                  <Progress value={83} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                <CardTitle>This Week</CardTitle>
              </div>
              <CardDescription>Your weekly activity summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Workouts Completed</span>
                  <span className="font-semibold">4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Active Time</span>
                  <span className="font-semibold">2h 15m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Calories Burned</span>
                  <span className="font-semibold">1,250</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <CardTitle>Quick Workouts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  10-Minute Morning Stretch
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  15-Minute HIIT Workout
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  20-Minute Yoga Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <CardTitle>Fitness Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Stay hydrated throughout the day</li>
                <li>• Warm up before exercising</li>
                <li>• Get 7-9 hours of sleep</li>
                <li>• Listen to your body and rest when needed</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Fitness;
