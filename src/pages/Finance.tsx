import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, PiggyBank, TrendingUp, Wallet, Plus, CheckCircle, Circle, Trash2, Clock, BarChart3, Target, RefreshCw, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(999999, "Amount too large"),
  description: z.string().trim().min(1, "Description is required").max(200),
  type: z.enum(["income", "expense"]),
});

const choreSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  allowance_amount: z.number().positive("Allowance must be positive").max(10000),
  frequency: z.enum(["once", "daily", "weekly", "monthly"]),
});

const savingsGoalSchema = z.object({
  goal_name: z.string().trim().min(1, "Goal name is required").max(100),
  target_amount: z.number().positive("Target amount must be positive").max(999999),
});

const Finance = () => {
  const navigate = useNavigate();
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [isChoreOpen, setIsChoreOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [spendingInsights, setSpendingInsights] = useState<string[]>([]);
  const [budgetSuggestions, setBudgetSuggestions] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState(false);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);

  // Transaction form state
  const [transAmount, setTransAmount] = useState("");
  const [transDescription, setTransDescription] = useState("");
  const [transType, setTransType] = useState<"income" | "expense">("expense");

  // Chore form state
  const [choreTitle, setChoreTitle] = useState("");
  const [choreDescription, setChoreDescription] = useState("");
  const [choreAmount, setChoreAmount] = useState("");
  const [choreFrequency, setChoreFrequency] = useState<"once" | "daily" | "weekly" | "monthly">("once");

  // Savings goal form state
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDate, setGoalDate] = useState("");

  // Fetch user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch transactions
  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch chores
  const { data: chores = [], refetch: refetchChores } = useQuery({
    queryKey: ['chores', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch chore completions
  const { data: choreCompletions = [], refetch: refetchCompletions } = useQuery({
    queryKey: ['chore-completions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('chore_completions')
        .select('*, chores(*)')
        .eq('user_id', user.id)
        .order('completed_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch savings goals
  const { data: savingsGoals = [], refetch: refetchGoals } = useQuery({
    queryKey: ['savings-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch budget
  const { data: budgetData, refetch: refetchBudget } = useQuery({
    queryKey: ['budget', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('budget_categories')
        .select('monthly_budget')
        .eq('user_id', user.id)
        .eq('name', 'Monthly Budget')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate budget summary
  const budgetSummary = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

    const budget = budgetData?.monthly_budget ? parseFloat(budgetData.monthly_budget as any) : 0;
    const remaining = budget > 0 ? budget - expenses : 0;
    const usagePercent = budget > 0 ? (expenses / budget) * 100 : 0;

    let healthStatus: 'on-track' | 'watch' | 'over' = 'on-track';
    if (budget > 0) {
      if (expenses > budget) healthStatus = 'over';
      else if (usagePercent >= 75) healthStatus = 'watch';
    }

    return { income, expenses, balance: income - expenses, budget, remaining, healthStatus, usagePercent };
  }, [transactions, budgetData]);

  // Calculate pending allowances
  const pendingAllowance = useMemo(() => {
    return choreCompletions
      .filter(c => !c.is_paid)
      .reduce((sum, c) => sum + parseFloat((c.chores as any)?.allowance_amount || 0), 0);
  }, [choreCompletions]);

  // Chart data for income vs expenses
  const incomeVsExpensesData = useMemo(() => {
    return [
      { name: 'Income', amount: budgetSummary.income, fill: '#10b981' },
      { name: 'Expenses', amount: budgetSummary.expenses, fill: '#ef4444' },
    ];
  }, [budgetSummary]);

  // Chart colors
  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

  // Transaction categories breakdown
  const categoryBreakdown = useMemo(() => {
    const categories: { [key: string]: number } = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = t.description.split(' ')[0] || 'Other';
        categories[category] = (categories[category] || 0) + parseFloat(t.amount as any);
      });

    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length],
    }));
  }, [transactions]);

  const handleAddTransaction = async () => {
    if (!user?.id) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }

    try {
      const amount = parseFloat(transAmount);
      transactionSchema.parse({ amount, description: transDescription, type: transType });
      
      setIsSubmitting(true);
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          amount,
          description: transDescription.trim(),
          type: transType,
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
        }]);

      if (error) throw error;

      toast({ title: "Transaction Added", description: `${transType === 'income' ? 'Income' : 'Expense'} of $${amount} recorded.` });
      
      setIsTransactionOpen(false);
      setTransAmount("");
      setTransDescription("");
      refetchTransactions();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to add transaction.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddChore = async () => {
    if (!user?.id) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }

    try {
      const amount = parseFloat(choreAmount);
      choreSchema.parse({ title: choreTitle, allowance_amount: amount, frequency: choreFrequency });
      
      setIsSubmitting(true);
      const { error } = await supabase
        .from('chores')
        .insert([{
          user_id: user.id,
          title: choreTitle.trim(),
          description: choreDescription.trim() || null,
          allowance_amount: amount,
          frequency: choreFrequency,
        }]);

      if (error) throw error;

      toast({ title: "Chore Added", description: `${choreTitle} added with $${amount} allowance.` });
      
      setIsChoreOpen(false);
      setChoreTitle("");
      setChoreDescription("");
      setChoreAmount("");
      refetchChores();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to add chore.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteChore = async (choreId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('chore_completions')
        .insert([{
          chore_id: choreId,
          user_id: user.id,
          completed_date: format(new Date(), 'yyyy-MM-dd'),
        }]);

      if (error) throw error;

      toast({ title: "Chore Completed! ✓", description: "Great job! Your allowance will be added to pending." });
      refetchCompletions();
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark chore as complete.", variant: "destructive" });
    }
  };

  const handleCollectAllowance = async () => {
    if (!user?.id || pendingAllowance === 0) return;

    try {
      setIsSubmitting(true);
      
      // Mark all unpaid completions as paid
      const unpaidCompletions = choreCompletions.filter(c => !c.is_paid);
      const { error: updateError } = await supabase
        .from('chore_completions')
        .update({ is_paid: true })
        .in('id', unpaidCompletions.map(c => c.id));

      if (updateError) throw updateError;

      // Add income transaction
      const { error: transError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          amount: pendingAllowance,
          description: 'Allowance collected from completed chores',
          type: 'income',
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
        }]);

      if (transError) throw transError;

      toast({ title: "Allowance Collected! 💰", description: `$${pendingAllowance.toFixed(2)} added to your income.` });
      
      refetchCompletions();
      refetchTransactions();
    } catch (error) {
      toast({ title: "Error", description: "Failed to collect allowance.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddGoal = async () => {
    if (!user?.id) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }

    try {
      const amount = parseFloat(goalAmount);
      savingsGoalSchema.parse({ goal_name: goalName, target_amount: amount });
      
      setIsSubmitting(true);
      const { error } = await supabase
        .from('savings_goals')
        .insert([{
          user_id: user.id,
          goal_name: goalName.trim(),
          target_amount: amount,
          target_date: goalDate || null,
        }]);

      if (error) throw error;

      toast({ title: "Savings Goal Added", description: `Goal "${goalName}" created!` });
      
      setIsGoalOpen(false);
      setGoalName("");
      setGoalAmount("");
      setGoalDate("");
      refetchGoals();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to add goal.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToGoal = async (goalId: string, amount: number) => {
    try {
      const goal = savingsGoals.find(g => g.id === goalId);
      if (!goal) return;

      const newAmount = parseFloat(goal.current_amount as any) + amount;
      
      const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId);

      if (error) throw error;

      toast({ title: "Progress Updated", description: `Added $${amount} to ${goal.goal_name}!` });
      refetchGoals();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update goal.", variant: "destructive" });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Deleted", description: "Transaction removed successfully." });
      refetchTransactions();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete transaction.", variant: "destructive" });
    }
  };

  const handleDeleteChore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Deleted", description: "Chore removed successfully." });
      refetchChores();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete chore.", variant: "destructive" });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Deleted", description: "Savings goal removed successfully." });
      refetchGoals();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete goal.", variant: "destructive" });
    }
  };

  const handleSetBudget = async () => {
    if (!user?.id) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }

    try {
      const budget = parseFloat(monthlyBudget);
      if (isNaN(budget) || budget <= 0) {
        toast({ title: "Invalid Input", description: "Please enter a valid budget amount", variant: "destructive" });
        return;
      }

      setIsSubmitting(true);

      // Check if budget exists
      const { data: existing } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Monthly Budget')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('budget_categories')
          .update({ monthly_budget: budget })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('budget_categories')
          .insert([{
            user_id: user.id,
            name: 'Monthly Budget',
            type: 'expense',
            monthly_budget: budget,
          }]);

        if (error) throw error;
      }

      toast({ title: "Budget Set", description: `Monthly budget set to $${budget.toFixed(2)}` });
      setIsBudgetOpen(false);
      setMonthlyBudget("");
      refetchBudget();
    } catch (error) {
      toast({ title: "Error", description: "Failed to set budget.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSpendingInsights = useCallback(async () => {
    if (!user?.id || transactions.length === 0) return;
    setInsightsLoading(true);
    try {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const currentMonthTx = transactions.filter(t => {
        const d = new Date(t.transaction_date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
      const lastMonthTx = transactions.filter(t => {
        const d = new Date(t.transaction_date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      });

      const curIncome = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount as any), 0);
      const curExpenses = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount as any), 0);
      const prevIncome = lastMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount as any), 0);
      const prevExpenses = lastMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount as any), 0);

      const categories: Record<string, number> = {};
      currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.description.split(' ')[0] || 'Other';
        categories[cat] = (categories[cat] || 0) + parseFloat(t.amount as any);
      });

      const { data, error } = await supabase.functions.invoke('finance-insights', {
        body: {
          type: 'monthly-insights',
          financialData: {
            currentMonth: { income: curIncome, expenses: curExpenses, categories },
            previousMonth: { income: prevIncome, expenses: prevExpenses },
            budget: budgetSummary.budget,
            savingsRate: curIncome > 0 ? ((curIncome - curExpenses) / curIncome * 100).toFixed(1) : 0,
          }
        }
      });

      if (error) throw error;
      setSpendingInsights(data.insights || []);
      setInsightsGenerated(true);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate spending insights.", variant: "destructive" });
    } finally {
      setInsightsLoading(false);
    }
  }, [user?.id, transactions, budgetSummary.budget]);

  const fetchBudgetSuggestions = useCallback(async () => {
    if (!user?.id || budgetSummary.budget === 0) return;
    setSuggestionsLoading(true);
    try {
      const categories: Record<string, number> = {};
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      transactions.filter(t => {
        const d = new Date(t.transaction_date);
        return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).forEach(t => {
        const cat = t.description.split(' ')[0] || 'Other';
        categories[cat] = (categories[cat] || 0) + parseFloat(t.amount as any);
      });

      const { data, error } = await supabase.functions.invoke('finance-insights', {
        body: {
          type: 'budget-suggestions',
          financialData: {
            budget: budgetSummary.budget,
            totalExpenses: budgetSummary.expenses,
            remaining: budgetSummary.remaining,
            income: budgetSummary.income,
            categories,
            savingsGoals: savingsGoals.map(g => ({ name: g.goal_name, target: g.target_amount, current: g.current_amount })),
          }
        }
      });

      if (error) throw error;
      setBudgetSuggestions(data.insights || []);
      setSuggestionsGenerated(true);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate budget suggestions.", variant: "destructive" });
    } finally {
      setSuggestionsLoading(false);
    }
  }, [user?.id, transactions, budgetSummary, savingsGoals]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-emerald-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 safe-top">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
            Finance Hub
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Budget Overview */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Budget</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-2">
                ${budgetSummary.budget > 0 ? budgetSummary.budget.toFixed(2) : '--'}
              </div>
              <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full min-h-[44px]">Set Budget</Button>
                </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Monthly Budget</DialogTitle>
                      <DialogDescription>Set your total monthly spending limit</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Budget Amount ($)</Label>
                        <Input
                          type="number"
                          placeholder="1000.00"
                          value={monthlyBudget}
                          onChange={(e) => setMonthlyBudget(e.target.value)}
                          step="0.01"
                        />
                      </div>
                      <Button onClick={handleSetBudget} disabled={isSubmitting} className="w-full">
                        Set Budget
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>This Month's Income</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">${budgetSummary.income.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>This Month's Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${budgetSummary.expenses.toFixed(2)}</div>
              {budgetSummary.budget > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  ${budgetSummary.remaining.toFixed(2)} remaining
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${budgetSummary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${budgetSummary.balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Financial Health</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetSummary.budget > 0 ? (
                <div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {budgetSummary.healthStatus === 'on-track' && <><span className="text-emerald-500">🟢</span><span className="text-emerald-600 text-base">On Track</span></>}
                    {budgetSummary.healthStatus === 'watch' && <><span className="text-amber-500">🟡</span><span className="text-amber-600 text-base">Watch Spending</span></>}
                    {budgetSummary.healthStatus === 'over' && <><span className="text-red-500">🔴</span><span className="text-red-600 text-base">Over Budget</span></>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {budgetSummary.usagePercent.toFixed(0)}% of budget used
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Set a budget</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="budget" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="chores" className="text-xs sm:text-sm">Chores & Allowance</TabsTrigger>
            <TabsTrigger value="goals">Savings Goals</TabsTrigger>
          </TabsList>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-6">
            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              {/* Income vs Expenses Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses</CardTitle>
                  <CardDescription>This month's financial overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={incomeVsExpensesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        {incomeVsExpensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Spending Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending Breakdown</CardTitle>
                  <CardDescription>Expense categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number) => `$${value.toFixed(2)}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No expense data to display
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Insights Section */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Monthly Spending Insights */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="w-5 h-5 text-amber-500" />
                        Monthly Spending Insights
                      </CardTitle>
                      <CardDescription>AI-generated analysis of your spending</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchSpendingInsights}
                      disabled={insightsLoading || transactions.length === 0}
                    >
                      {insightsLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>{insightsGenerated ? 'Refresh' : 'Generate'}</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {spendingInsights.length > 0 ? (
                    <ul className="space-y-2">
                      {spendingInsights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {transactions.length === 0
                        ? 'Add some transactions first to get insights.'
                        : 'Click "Generate" to get AI-powered spending insights.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Smart Budget Suggestions */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="w-5 h-5 text-blue-500" />
                        Smart Budget Suggestions
                      </CardTitle>
                      <CardDescription>Personalized tips to stay on track</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchBudgetSuggestions}
                      disabled={suggestionsLoading || budgetSummary.budget === 0}
                    >
                      {suggestionsLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>{suggestionsGenerated ? 'Refresh' : 'Generate'}</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {budgetSuggestions.length > 0 ? (
                    <ul className="space-y-2">
                      {budgetSuggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {budgetSummary.budget === 0
                        ? 'Set a monthly budget first to get suggestions.'
                        : 'Click "Generate" for AI-powered budget advice.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Financial Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  Financial Literacy Resources
                </CardTitle>
                <CardDescription>Trusted tools and guides to build your money skills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { name: "Money and Youth", url: "https://moneyandyouth.com/", desc: "Interactive financial literacy program for young Canadians" },
                    { name: "Get Smarter About Money – Scams", url: "https://www.getsmarteraboutmoney.ca/scams/", desc: "Learn to identify and avoid financial scams" },
                    { name: "Investopedia – Budgeting Basics", url: "https://www.investopedia.com/budgeting-4689726", desc: "Comprehensive guide to budgeting fundamentals" },
                    { name: "Khan Academy – Personal Finance", url: "https://www.khanacademy.org/college-careers-more/personal-finance", desc: "Free courses on budgeting, saving, and investing" },
                  ].map((resource) => (
                    <button
                      key={resource.url}
                      onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left"
                    >
                      <ExternalLink className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-medium text-sm">{resource.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{resource.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold">Transactions</h2>
              <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="self-start sm:self-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>Record an income or expense</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={transType} onValueChange={(v) => setTransType(v as "income" | "expense")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        placeholder="25.00"
                        value={transAmount}
                        onChange={(e) => setTransAmount(e.target.value)}
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="What was this for?"
                        value={transDescription}
                        onChange={(e) => setTransDescription(e.target.value)}
                        maxLength={200}
                      />
                    </div>
                    <Button onClick={handleAddTransaction} disabled={isSubmitting} className="w-full">
                      Add Transaction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {transactions.length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No transactions yet. Start tracking your income and expenses!
                  </CardContent>
                </Card>
              ) : (
                transactions.map((trans) => (
                  <Card key={trans.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">{trans.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(trans.transaction_date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-lg font-bold ${trans.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trans.type === 'income' ? '+' : '-'}${parseFloat(trans.amount as any).toFixed(2)}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteTransaction(trans.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Chores Tab */}
          <TabsContent value="chores" className="space-y-6">
            {/* Pending Allowance Banner */}
            {pendingAllowance > 0 && (
              <Card className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-300">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Pending Allowance</div>
                      <div className="text-2xl font-bold text-emerald-600">${pendingAllowance.toFixed(2)}</div>
                    </div>
                    <Button onClick={handleCollectAllowance} disabled={isSubmitting}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Collect Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold">Active Chores</h2>
              <Dialog open={isChoreOpen} onOpenChange={setIsChoreOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chore
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Chore</DialogTitle>
                    <DialogDescription>Set up a chore with allowance</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Chore Title</Label>
                      <Input
                        placeholder="e.g., Take out trash"
                        value={choreTitle}
                        onChange={(e) => setChoreTitle(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        placeholder="Additional details..."
                        value={choreDescription}
                        onChange={(e) => setChoreDescription(e.target.value)}
                        maxLength={500}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Allowance Amount ($)</Label>
                      <Input
                        type="number"
                        placeholder="5.00"
                        value={choreAmount}
                        onChange={(e) => setChoreAmount(e.target.value)}
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={choreFrequency} onValueChange={(v) => setChoreFrequency(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">One Time</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddChore} disabled={isSubmitting} className="w-full">
                      Add Chore
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {chores.length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No active chores. Add chores to start earning allowance!
                  </CardContent>
                </Card>
              ) : (
                chores.map((chore) => (
                  <Card key={chore.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-semibold">{chore.title}</div>
                          {chore.description && (
                            <div className="text-sm text-muted-foreground">{chore.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            {chore.frequency}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteChore(chore.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-lg font-bold text-emerald-600">
                          ${parseFloat(chore.allowance_amount as any).toFixed(2)}
                        </div>
                        <Button size="sm" onClick={() => handleCompleteChore(chore.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Savings Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold">Savings Goals</h2>
              <Dialog open={isGoalOpen} onOpenChange={setIsGoalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Savings Goal</DialogTitle>
                    <DialogDescription>Set a financial goal to work towards</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Goal Name</Label>
                      <Input
                        placeholder="e.g., New Phone"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Amount ($)</Label>
                      <Input
                        type="number"
                        placeholder="500.00"
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Date (Optional)</Label>
                      <Input
                        type="date"
                        value={goalDate}
                        onChange={(e) => setGoalDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddGoal} disabled={isSubmitting} className="w-full">
                      Create Goal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {savingsGoals.length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No savings goals yet. Create goals to track your financial progress!
                  </CardContent>
                </Card>
              ) : (
                savingsGoals.map((goal) => {
                  const progress = (parseFloat(goal.current_amount as any) / parseFloat(goal.target_amount as any)) * 100;
                  return (
                    <Card key={goal.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
                            {goal.target_date && (
                              <CardDescription>
                                Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <PiggyBank className="w-5 h-5 text-emerald-500" />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>${parseFloat(goal.current_amount as any).toFixed(2)}</span>
                            <span>${parseFloat(goal.target_amount as any).toFixed(2)}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="text-center text-sm text-muted-foreground mt-1">
                            {progress.toFixed(0)}% Complete
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleAddToGoal(goal.id, 5)}
                          >
                            +$5
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleAddToGoal(goal.id, 10)}
                          >
                            +$10
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleAddToGoal(goal.id, 25)}
                          >
                            +$25
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Finance;
