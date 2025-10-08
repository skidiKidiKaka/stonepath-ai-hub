import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Heart, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Relationships = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-pink-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
            Relationships
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <CardTitle>Relationship Health</CardTitle>
              </div>
              <CardDescription>Understanding healthy relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ Open and honest communication</li>
                <li>✓ Mutual respect and trust</li>
                <li>✓ Supporting each other's goals</li>
                <li>✓ Healthy boundaries</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-pink-500" />
                <CardTitle>Communication Skills</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Active Listening Guide
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Expressing Feelings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Conflict Resolution
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                <CardTitle>Relationship Types</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Romantic Relationships</p>
                  <p className="text-sm text-muted-foreground">Building healthy partnerships</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Family Relationships</p>
                  <p className="text-sm text-muted-foreground">Navigating family dynamics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                <CardTitle>Relationship Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Communicate openly and honestly</li>
                <li>• Respect personal boundaries</li>
                <li>• Show appreciation regularly</li>
                <li>• Work through conflicts together</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Relationships;
