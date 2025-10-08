import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Finance = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-emerald-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
            Finance
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-emerald-500" />
                <CardTitle>Savings Goals</CardTitle>
              </div>
              <CardDescription>Track your financial objectives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Emergency Fund</span>
                    <span>$500 / $1,000</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>New Laptop</span>
                    <span>$400 / $800</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                <CardTitle>Monthly Budget</CardTitle>
              </div>
              <CardDescription>This month's spending overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Food & Dining</span>
                  <span className="font-semibold">$150</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Entertainment</span>
                  <span className="font-semibold">$80</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Transportation</span>
                  <span className="font-semibold">$60</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <CardTitle>Financial Literacy</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Budgeting Basics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Saving Strategies
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Understanding Credit
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <CardTitle>Money Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Track all your expenses</li>
                <li>• Save at least 10% of income</li>
                <li>• Avoid impulse purchases</li>
                <li>• Build an emergency fund</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Finance;
