import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MessageCircle, Shield, Heart, BookOpen, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const crisisResources = [
  { name: "National Suicide Prevention Lifeline", contact: "988", description: "24/7 crisis support for anyone in distress", icon: Phone },
  { name: "Crisis Text Line", contact: "Text HOME to 741741", description: "Free 24/7 text-based mental health support", icon: MessageCircle },
  { name: "SAMHSA Helpline", contact: "1-800-662-4357", description: "Free referral & info service for mental health", icon: Heart },
  { name: "StopBullying.gov", contact: "stopbullying.gov", description: "Federal government resources on bullying prevention", icon: Shield },
];

const faqs = [
  {
    q: "How do I track my mood?",
    a: "Head to the Mental Health pillar from your dashboard. You'll find the Mood Tracker where you can log how you're feeling, select emotions, and track factors impacting your mood over time."
  },
  {
    q: "How does Headspace Hangout work?",
    a: "Headspace Hangout is a guided self-reflection experience. Choose a topic, answer thoughtful prompts, and receive a personalized summary. It helps you process thoughts and build self-awareness."
  },
  {
    q: "Can I connect with other students?",
    a: "Yes! Use the Friendships pillar to join or create groups, chat with members, plan events, and coordinate availability with friends."
  },
  {
    q: "How do I use the Pomodoro Timer?",
    a: "Go to the Academics pillar and find the Pomodoro Timer. It helps you study in focused intervals (25 min work, 5 min break) to boost productivity."
  },
  {
    q: "Is my data private?",
    a: "Absolutely. Your personal data including mood entries, journal responses, and reports are private to your account. Bullying reports are anonymous and cannot be viewed after submission."
  },
  {
    q: "How do I change my profile picture?",
    a: "Click your avatar in the top-right corner, select 'Edit Profile', and click the camera icon on your profile picture to upload a new one."
  },
  {
    q: "What is Peer Connect?",
    a: "Peer Connect matches you with another student for a guided conversation around a shared topic. It's a safe space to connect, share perspectives, and build empathy."
  },
];

const HelpSupport = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/5 to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 safe-top">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Help & Support</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* Crisis Resources */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-bold">Crisis Resources</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            If you or someone you know is in crisis, please reach out to these free, confidential resources available 24/7.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {crisisResources.map((resource) => {
              const Icon = resource.icon;
              return (
                <Card key={resource.name} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm">{resource.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                  <p className="text-sm font-medium text-primary">{resource.contact}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* Quick Links */}
        <section>
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/bullying")}>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-500" />
                <span className="font-medium text-sm">Peer Support</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Report bullying & get help</p>
            </Card>
            <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/mental-health")}>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-medium text-sm">Mental Health</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mood tracking & wellness</p>
            </Card>
            <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/feedback")}>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-sm">Send Feedback</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Help us improve</p>
            </Card>
          </div>
        </section>

        <Separator />

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <Separator />

        {/* Contact */}
        <section>
          <h2 className="text-xl font-bold mb-4">Still Need Help?</h2>
          <Card className="p-6 text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              Can't find what you're looking for? Reach out to your school counselor or use the Peer Support page to report any issues anonymously.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/bullying")}>
                <Shield className="mr-2 h-4 w-4" />
                Go to Peer Support
              </Button>
              <Button variant="outline" onClick={() => navigate("/feedback")}>
                <Mail className="mr-2 h-4 w-4" />
                Send Feedback
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default HelpSupport;
