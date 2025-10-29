import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertCircle, Phone, Heart, Send, UserPlus, Sparkles, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const reportSchema = z.object({
  incident_type: z.string().min(1, "Please select an incident type"),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(1000, "Description must be less than 1000 characters"),
});

const mentorRequestSchema = z.object({
  request_type: z.string().min(1, "Please select a request type"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
});

const counselorRequestSchema = z.object({
  urgency_level: z.string().min(1, "Please select urgency level"),
  preferred_contact: z.string().min(1, "Please select preferred contact method"),
  reason: z.string().min(1, "Please select a reason"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
});

const Bullying = () => {
  const navigate = useNavigate();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [isCounselorOpen, setIsCounselorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report form state
  const [incidentType, setIncidentType] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  // Mentor request form state
  const [mentorType, setMentorType] = useState("");
  const [mentorDescription, setMentorDescription] = useState("");

  // Counselor request form state
  const [urgencyLevel, setUrgencyLevel] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [counselorReason, setCounselorReason] = useState("");
  const [counselorDescription, setCounselorDescription] = useState("");

  // Daily kindness challenges
  const kindnessChallenges = [
    "Compliment three people today",
    "Help someone with their homework",
    "Share your lunch with someone",
    "Stand up for someone being treated unfairly",
    "Send a kind message to someone who looks sad",
    "Include someone who's sitting alone",
    "Thank a teacher or staff member",
  ];

  const challengeOfTheDay = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return kindnessChallenges[dayOfYear % kindnessChallenges.length];
  }, []);

  const handleSubmitReport = async () => {
    try {
      reportSchema.parse({ incident_type: incidentType, description: reportDescription });
      
      setIsSubmitting(true);
      const { error } = await supabase
        .from('bullying_reports')
        .insert([{
          incident_type: incidentType,
          description: reportDescription.trim(),
          is_urgent: isUrgent,
        }]);

      if (error) throw error;

      toast({
        title: "Report Submitted",
        description: "Your anonymous report has been submitted. A counselor will review it shortly.",
      });
      
      setIsReportOpen(false);
      setIncidentType("");
      setReportDescription("");
      setIsUrgent(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Report",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit report. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMentorRequest = async () => {
    try {
      mentorRequestSchema.parse({ request_type: mentorType, description: mentorDescription });
      
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('mentor_requests')
        .insert([{
          user_id: user?.id || null,
          request_type: mentorType,
          description: mentorDescription.trim(),
        }]);

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your mentor request has been submitted. Someone will reach out to you soon.",
      });
      
      setIsMentorOpen(false);
      setMentorType("");
      setMentorDescription("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Request",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCounselorRequest = async () => {
    try {
      counselorRequestSchema.parse({ 
        urgency_level: urgencyLevel, 
        preferred_contact: preferredContact,
        reason: counselorReason,
        description: counselorDescription 
      });
      
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('counselor_requests')
        .insert([{
          user_id: user?.id || null,
          urgency_level: urgencyLevel,
          preferred_contact: preferredContact,
          reason: counselorReason,
          description: counselorDescription.trim(),
        }]);

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: urgencyLevel === "urgent" 
          ? "Your urgent request has been submitted. A counselor will contact you as soon as possible."
          : "Your counseling request has been submitted. A counselor will reach out within 24-48 hours.",
      });
      
      setIsCounselorOpen(false);
      setUrgencyLevel("");
      setPreferredContact("");
      setCounselorReason("");
      setCounselorDescription("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Request",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cyan-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-cyan-500 to-cyan-600 bg-clip-text text-transparent">
            Peer Support
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
                <Dialog open={isCounselorOpen} onOpenChange={setIsCounselorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Phone className="w-4 h-4 mr-2" />
                      Talk to School Counselor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Request Counseling Session</DialogTitle>
                      <DialogDescription>
                        A school counselor will reach out to schedule a confidential session.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>How urgent is this?</Label>
                        <Select value={urgencyLevel} onValueChange={setUrgencyLevel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent - Need help ASAP</SelectItem>
                            <SelectItem value="soon">Soon - Within a few days</SelectItem>
                            <SelectItem value="routine">Routine - Within a week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Preferred Contact Method</Label>
                        <Select value={preferredContact} onValueChange={setPreferredContact}>
                          <SelectTrigger>
                            <SelectValue placeholder="How should we reach you?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-person">In-Person Meeting</SelectItem>
                            <SelectItem value="phone">Phone Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="any">Any Method</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>What do you need help with?</Label>
                        <Select value={counselorReason} onValueChange={setCounselorReason}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bullying">Bullying or Harassment</SelectItem>
                            <SelectItem value="mental-health">Mental Health Support</SelectItem>
                            <SelectItem value="academic">Academic Stress</SelectItem>
                            <SelectItem value="family">Family Issues</SelectItem>
                            <SelectItem value="peer">Peer Relationships</SelectItem>
                            <SelectItem value="other">Other Concerns</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Additional Details (10-1000 characters)</Label>
                        <Textarea
                          placeholder="Share more about what you're experiencing and how we can help..."
                          value={counselorDescription}
                          onChange={(e) => setCounselorDescription(e.target.value)}
                          className="min-h-[120px]"
                          maxLength={1000}
                        />
                        <span className="text-sm text-muted-foreground">
                          {counselorDescription.length}/1000 characters
                        </span>
                      </div>

                      <Button 
                        onClick={handleSubmitCounselorRequest}
                        disabled={isSubmitting || !urgencyLevel || !preferredContact || !counselorReason || counselorDescription.length < 10}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Request
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Flag className="w-4 h-4 mr-2" />
                      Report Incident Anonymously
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Report Bullying Anonymously</DialogTitle>
                      <DialogDescription>
                        Your report is completely anonymous. We're here to help.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Type of Incident</Label>
                        <Select value={incidentType} onValueChange={setIncidentType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select incident type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">Physical Bullying</SelectItem>
                            <SelectItem value="verbal">Verbal Bullying</SelectItem>
                            <SelectItem value="social">Social Bullying</SelectItem>
                            <SelectItem value="cyberbullying">Cyberbullying</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Description (20-1000 characters)</Label>
                        <Textarea
                          placeholder="Describe what happened... When, where, who was involved, etc."
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          className="min-h-[120px]"
                          maxLength={1000}
                        />
                        <span className="text-sm text-muted-foreground">
                          {reportDescription.length}/1000 characters
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="urgent" 
                          checked={isUrgent}
                          onCheckedChange={(checked) => setIsUrgent(checked as boolean)}
                        />
                        <label
                          htmlFor="urgent"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          This is urgent and needs immediate attention
                        </label>
                      </div>

                      <Button 
                        onClick={handleSubmitReport}
                        disabled={isSubmitting || !incidentType || reportDescription.length < 20}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Report
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isMentorOpen} onOpenChange={setIsMentorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Request a Mentor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request a Peer Mentor</DialogTitle>
                      <DialogDescription>
                        Connect with someone who can support you through difficult times.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>What do you need help with?</Label>
                        <Select value={mentorType} onValueChange={setMentorType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select support type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bullying">Dealing with Bullying</SelectItem>
                            <SelectItem value="friendship">Friendship Issues</SelectItem>
                            <SelectItem value="confidence">Building Confidence</SelectItem>
                            <SelectItem value="stress">Managing Stress</SelectItem>
                            <SelectItem value="other">Other Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tell us more (10-500 characters)</Label>
                        <Textarea
                          placeholder="Share what you're going through and how a mentor could help..."
                          value={mentorDescription}
                          onChange={(e) => setMentorDescription(e.target.value)}
                          className="min-h-[100px]"
                          maxLength={500}
                        />
                        <span className="text-sm text-muted-foreground">
                          {mentorDescription.length}/500 characters
                        </span>
                      </div>

                      <Button 
                        onClick={handleSubmitMentorRequest}
                        disabled={isSubmitting || !mentorType || mentorDescription.length < 10}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Request
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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

        {/* Daily Kindness Challenge */}
        <Card className="mt-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-200 dark:border-cyan-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <CardTitle>Kindness Challenge of the Day</CardTitle>
            </div>
            <CardDescription>Small acts of kindness can make a big difference</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium mb-4">Today's Challenge:</p>
            <p className="text-xl italic">{challengeOfTheDay}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Bullying;
