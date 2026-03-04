import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, BookOpen, Users, Heart, Briefcase, DollarSign, MessageCircle, Shield, MessageSquare, LogOut, ListTodo, Sparkles, User, Moon, Sun, Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { AiChatDialog } from "@/components/AiChatDialog";
import { NewsCarousel } from "@/components/NewsCarousel";
import { PCTStats } from "@/components/PCTStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

const getUserInitials = (user: SupabaseUser): string => {
  const name = user.user_metadata?.full_name;
  if (name) {
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return (user.email?.[0] || "U").toUpperCase();
};

const pillars = [
  { id: "career", name: "Career", icon: Briefcase, color: "from-orange-500 to-orange-600" },
  { id: "mental-health", name: "Mental Health", icon: Brain, color: "from-purple-500 to-purple-600" },
  { id: "academics", name: "Academics", icon: BookOpen, color: "from-blue-500 to-blue-600" },
  { id: "friendships", name: "Friendships", icon: Users, color: "from-green-500 to-green-600" },
  { id: "relationships", name: "Relationships", icon: MessageCircle, color: "from-pink-500 to-pink-600" },
  { id: "bullying", name: "Peer Support", icon: Shield, color: "from-cyan-500 to-cyan-600" },
  { id: "fitness", name: "Fitness", icon: Heart, color: "from-red-500 to-red-600" },
  { id: "finance", name: "Finance", icon: DollarSign, color: "from-emerald-500 to-emerald-600" },
];

const affirmations = [
  "You are capable of amazing things",
  "Every step forward is progress",
  "Your potential is limitless",
  "Believe in yourself today",
  "You are worthy of success",
  "Today is full of possibilities",
  "Your growth journey is unique and valuable",
  "Small steps lead to big changes",
  "You have the strength to overcome challenges",
  "Your voice matters and deserves to be heard",
  "Mistakes are opportunities for learning",
  "You are making a positive difference",
  "Every day is a chance to start fresh",
  "Your dreams are worth pursuing",
  "You are exactly where you need to be",
  "Trust the process of your journey",
  "Your resilience is your superpower",
  "You deserve kindness, especially from yourself",
  "Progress, not perfection, is the goal",
  "You are stronger than you think",
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchAvatarUrl(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchAvatarUrl(session.user.id);
      }
    });

    const interval = setInterval(() => {
      setCurrentAffirmation((prev) => (prev + 1) % affirmations.length);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [navigate]);

  const fetchAvatarUrl = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .single();
    if (data?.avatar_url) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handlePillarClick = (pillarId: string) => {
    navigate(`/${pillarId}`);
  };

  const isDark = theme === "dark";

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/5 to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 safe-top">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Stone Path Project
            </h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email}!</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.user_metadata?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tasks")}>
                <ListTodo className="mr-2 h-4 w-4" />
                Tasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between">
                <div className="flex items-center">
                  {isDark ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                  Dark Mode
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  className="ml-2"
                />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Notifications coming soon!")}>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/help")}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/feedback")}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Feedback
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Daily Affirmation */}
        <Card className="mb-8 p-8 text-center bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 shadow-lg overflow-hidden">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Daily Affirmation
          </h2>
          <div className="relative min-h-[4rem] flex items-center justify-center">
            <p 
              key={currentAffirmation}
              className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-in fade-in zoom-in"
              style={{ animationDuration: '2000ms' }}
            >
              {affirmations[currentAffirmation]}
            </p>
          </div>
        </Card>

        {/* Headspace Hangout Card */}
        <Card
          className="mb-8 p-6 cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-primary/5 to-secondary/5"
          onClick={() => navigate("/headspace-hangout")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Headspace Hangout</h3>
                <p className="text-sm text-muted-foreground">Guided reflection & self-discovery</p>
              </div>
            </div>
            <PCTStats compact />
          </div>
        </Card>

        {/* Pillars Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Your Support Pillars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={pillar.id}
                  className="p-6 cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col items-center gap-3"
                  onClick={() => handlePillarClick(pillar.id)}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${pillar.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-base text-center">{pillar.name}</span>
                </Card>
              );
            })}
          </div>
        </div>

        {/* News Carousel */}
        <NewsCarousel />
      </main>

      {/* Floating AI Assistant */}
      <Button
        variant="gradient"
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl hover:scale-110 transition-transform safe-bottom"
        style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))', right: 'max(1.5rem, calc(env(safe-area-inset-right) + 0.5rem))' }}
        onClick={() => setAiChatOpen(true)}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      <AiChatDialog open={aiChatOpen} onOpenChange={setAiChatOpen} />
    </div>
  );
};

export default Dashboard;
