import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertCircle, Phone, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Bullying = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cyan-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-cyan-500 to-cyan-600 bg-clip-text text-transparent">
            Bullying Support
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            If you're in immediate danger, please call emergency services or contact a trusted adult.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-500" />
                <CardTitle>What is Bullying?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">
                Bullying is repeated, aggressive behavior intended to hurt, intimidate, or control another person.
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Physical bullying (hitting, pushing)</li>
                <li>• Verbal bullying (name-calling, threats)</li>
                <li>• Social bullying (exclusion, rumors)</li>
                <li>• Cyberbullying (online harassment)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-cyan-500" />
                <CardTitle>How to Respond</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Tell a trusted adult immediately</li>
                <li>• Document incidents (save messages, take screenshots)</li>
                <li>• Don't respond or retaliate</li>
                <li>• Stay with friends and avoid being alone</li>
                <li>• Block bullies on social media</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-cyan-500" />
                <CardTitle>Get Help</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Talk to School Counselor
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Report Incident
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Support Resources
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-500" />
                <CardTitle>Remember</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• It's not your fault</li>
                <li>• You don't deserve to be treated this way</li>
                <li>• You're not alone - help is available</li>
                <li>• Speaking up is brave and important</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Bullying;
