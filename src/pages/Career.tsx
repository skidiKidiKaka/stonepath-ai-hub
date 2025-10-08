import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Target, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Career = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            Career
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                <CardTitle>Career Goals</CardTitle>
              </div>
              <CardDescription>Track your professional development</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Resume Update</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>LinkedIn Profile</span>
                    <span>60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <CardTitle>Skills Development</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Communication</span>
                  <span className="font-semibold">Advanced</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Leadership</span>
                  <span className="font-semibold">Intermediate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Technical Skills</span>
                  <span className="font-semibold">Intermediate</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <CardTitle>Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Resume Templates
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Interview Prep Guide
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Career Exploration Tools
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-500" />
                <CardTitle>Career Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Network with professionals in your field</li>
                <li>• Seek internship opportunities</li>
                <li>• Develop both hard and soft skills</li>
                <li>• Stay updated with industry trends</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Career;
