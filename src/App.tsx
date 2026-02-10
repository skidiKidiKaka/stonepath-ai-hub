import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TaskPlanner from "./pages/TaskPlanner";
import NotFound from "./pages/NotFound";
import MentalHealth from "./pages/MentalHealth";
import Academics from "./pages/Academics";
import Friendships from "./pages/Friendships";
import Fitness from "./pages/Fitness";
import Career from "./pages/Career";
import Finance from "./pages/Finance";
import Relationships from "./pages/Relationships";
import Bullying from "./pages/Bullying";
import HeadspaceHangout from "./pages/HeadspaceHangout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<TaskPlanner />} />
          <Route path="/headspace-hangout" element={<HeadspaceHangout />} />
          <Route path="/mental-health" element={<MentalHealth />} />
          <Route path="/academics" element={<Academics />} />
          <Route path="/friendships" element={<Friendships />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/career" element={<Career />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/relationships" element={<Relationships />} />
          <Route path="/bullying" element={<Bullying />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
