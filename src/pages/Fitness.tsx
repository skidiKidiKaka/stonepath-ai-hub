import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Activity, Target, Flame, Plus, ChefHat, TrendingUp, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";

const workoutSchema = z.object({
  workout_type: z.string().min(1, "Please select a workout type"),
  duration_minutes: z.number().min(1, "Duration must be at least 1 minute").max(300, "Duration must be less than 300 minutes"),
  intensity: z.string().min(1, "Please select intensity level"),
});

const Fitness = () => {
  const navigate = useNavigate();
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Workout form state
  const [workoutType, setWorkoutType] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch workout logs
  const { data: workoutLogs = [], refetch: refetchWorkouts } = useQuery({
    queryKey: ['workout-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch streak data
  const { data: streakData, refetch: refetchStreak } = useQuery({
    queryKey: ['fitness-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('fitness_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Body positivity messages
  const motivationalMessages = [
    "Your body is capable of amazing things. Celebrate what it can do!",
    "Progress, not perfection. Every step forward counts.",
    "Strong is beautiful. You are both.",
    "Your worth is not measured by your weight or appearance.",
    "Movement is a celebration of what your body can do, not punishment.",
    "You are enough, exactly as you are today.",
    "Health looks different on everyone. Honor your unique journey.",
  ];

  const dailyMessage = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return motivationalMessages[dayOfYear % motivationalMessages.length];
  }, []);

  // Healthy recipes
  const recipes = [
    {
      name: "Rainbow Buddha Bowl",
      ingredients: "Quinoa, chickpeas, sweet potato, kale, avocado, tahini dressing",
      prep: "20 min",
      calories: 450,
    },
    {
      name: "Green Power Smoothie",
      ingredients: "Spinach, banana, almond milk, chia seeds, protein powder, berries",
      prep: "5 min",
      calories: 280,
    },
    {
      name: "Grilled Chicken & Veggie Wrap",
      ingredients: "Whole wheat tortilla, grilled chicken, hummus, mixed vegetables",
      prep: "15 min",
      calories: 380,
    },
    {
      name: "Overnight Oats",
      ingredients: "Oats, Greek yogurt, almond milk, berries, honey, nuts",
      prep: "5 min (+ overnight)",
      calories: 320,
    },
    {
      name: "Salmon & Quinoa Bowl",
      ingredients: "Baked salmon, quinoa, roasted broccoli, lemon tahini sauce",
      prep: "25 min",
      calories: 520,
    },
  ];

  const randomRecipe = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * recipes.length);
    return recipes[randomIndex];
  }, [isRecipeOpen]);

  const handleLogWorkout = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to track your workouts.",
        variant: "destructive",
      });
      return;
    }

    try {
      const durationNum = parseInt(duration);
      workoutSchema.parse({ 
        workout_type: workoutType, 
        duration_minutes: durationNum,
        intensity: intensity 
      });
      
      setIsSubmitting(true);
      const { error } = await supabase
        .from('workout_logs')
        .insert([{
          user_id: user.id,
          workout_type: workoutType,
          duration_minutes: durationNum,
          intensity: intensity,
          notes: notes.trim() || null,
          workout_date: format(new Date(), 'yyyy-MM-dd'),
        }]);

      if (error) throw error;

      toast({
        title: "Workout Logged! 🎉",
        description: `Great job! You completed ${durationNum} minutes of ${workoutType}.`,
      });
      
      setIsWorkoutOpen(false);
      setWorkoutType("");
      setDuration("");
      setIntensity("");
      setNotes("");
      refetchWorkouts();
      refetchStreak();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to log workout. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate this week's stats
  const weekStats = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weekWorkouts = workoutLogs.filter(log => 
      new Date(log.workout_date) >= oneWeekAgo
    );

    const totalMinutes = weekWorkouts.reduce((sum, log) => sum + log.duration_minutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      count: weekWorkouts.length,
      time: `${hours}h ${minutes}m`,
      calories: Math.round(totalMinutes * 5), // Rough estimate
    };
  }, [workoutLogs]);

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
        {/* Motivational Message */}
        <Card className="mb-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500" />
              <CardTitle>Daily Affirmation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg italic">{dailyMessage}</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Streak Tracker */}
          <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <CardTitle>Workout Streak</CardTitle>
              </div>
              <CardDescription>Keep the momentum going!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-red-500 mb-2">
                  {streakData?.current_streak || 0}
                </div>
                <p className="text-sm text-muted-foreground mb-4">Day Streak 🔥</p>
                <div className="flex justify-around text-sm">
                  <div>
                    <div className="font-semibold">{streakData?.longest_streak || 0}</div>
                    <div className="text-muted-foreground">Best</div>
                  </div>
                  <div>
                    <div className="font-semibold">{workoutLogs.length}</div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Stats */}
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
                  <span className="font-semibold">{weekStats.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Active Time</span>
                  <span className="font-semibold">{weekStats.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Calories Burned</span>
                  <span className="font-semibold">~{weekStats.calories}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log Workout */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                <CardTitle>Log Workout</CardTitle>
              </div>
              <CardDescription>Track your fitness activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isWorkoutOpen} onOpenChange={setIsWorkoutOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Log New Workout
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Log Your Workout</DialogTitle>
                    <DialogDescription>
                      Track your fitness activity and maintain your streak!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Workout Type</Label>
                      <Select value={workoutType} onValueChange={setWorkoutType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workout type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Running">Running</SelectItem>
                          <SelectItem value="Cycling">Cycling</SelectItem>
                          <SelectItem value="Swimming">Swimming</SelectItem>
                          <SelectItem value="Yoga">Yoga</SelectItem>
                          <SelectItem value="Weight Training">Weight Training</SelectItem>
                          <SelectItem value="HIIT">HIIT</SelectItem>
                          <SelectItem value="Walking">Walking</SelectItem>
                          <SelectItem value="Dance">Dance</SelectItem>
                          <SelectItem value="Sports">Sports</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        min="1"
                        max="300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Intensity</Label>
                      <Select value={intensity} onValueChange={setIntensity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intensity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Light">Light</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Vigorous">Vigorous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        placeholder="How did you feel? Any achievements?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[80px]"
                        maxLength={500}
                      />
                    </div>

                    <Button 
                      onClick={handleLogWorkout}
                      disabled={isSubmitting || !workoutType || !duration || !intensity}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Log Workout
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {workoutLogs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Recent Workouts</h4>
                  {workoutLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="text-sm p-2 bg-muted rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">{log.workout_type}</span>
                        <Badge variant="secondary">{log.intensity}</Badge>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {log.duration_minutes} min • {format(new Date(log.workout_date), 'MMM d')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Nutrition Section */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-red-500" />
                <CardTitle>Healthy Recipes</CardTitle>
              </div>
              <CardDescription>Quick and nutritious meal ideas</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Random Recipe
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{randomRecipe.name}</DialogTitle>
                    <DialogDescription>
                      A healthy and delicious meal option
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Ingredients:</h4>
                      <p className="text-sm text-muted-foreground">{randomRecipe.ingredients}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <div className="font-semibold">Prep Time</div>
                        <div className="text-muted-foreground">{randomRecipe.prep}</div>
                      </div>
                      <div>
                        <div className="font-semibold">Calories</div>
                        <div className="text-muted-foreground">~{randomRecipe.calories}</div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium mb-2">Recipe Ideas:</h4>
                {recipes.slice(0, 3).map((recipe, index) => (
                  <div key={index} className="text-sm p-2 bg-muted rounded">
                    <div className="font-medium">{recipe.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {recipe.prep} • ~{recipe.calories} cal
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <CardTitle>Wellness Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Stay hydrated - drink 8 glasses of water daily</li>
                <li>• Warm up before and cool down after exercise</li>
                <li>• Get 7-9 hours of quality sleep each night</li>
                <li>• Listen to your body and rest when needed</li>
                <li>• Eat a balanced diet with plenty of fruits and vegetables</li>
                <li>• Find activities you enjoy to stay motivated</li>
                <li>• Progress gradually to avoid injury</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Fitness;
