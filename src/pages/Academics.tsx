import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Target, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Academics = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Academics
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                <CardTitle>Current Goals</CardTitle>
              </div>
              <CardDescription>Track your academic objectives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Complete Math Assignment</span>
                    <span>80%</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Study for Biology Test</span>
                    <span>50%</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <CardTitle>Grade Overview</CardTitle>
              </div>
              <CardDescription>Your academic performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Mathematics</span>
                  <span className="font-semibold">A-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">English</span>
                  <span className="font-semibold">B+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Science</span>
                  <span className="font-semibold">A</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <CardTitle>Upcoming Deadlines</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>History Essay</span>
                  <span className="text-muted-foreground">2 days</span>
                </div>
                <div className="flex justify-between">
                  <span>Chemistry Lab Report</span>
                  <span className="text-muted-foreground">5 days</span>
                </div>
                <div className="flex justify-between">
                  <span>English Presentation</span>
                  <span className="text-muted-foreground">1 week</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <CardTitle>Study Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Math Practice Problems
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Study Guides Library
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Video Tutorials
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Academics;
