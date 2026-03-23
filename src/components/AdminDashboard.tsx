import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, MessageSquare, Users, Bell, TrendingUp, AlertTriangle, UserCheck, Megaphone, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BullyingReport {
  id: string;
  incident_type: string;
  description: string;
  is_urgent: boolean;
  status: string;
  created_at: string;
}

interface CounselorRequest {
  id: string;
  reason: string;
  description: string;
  urgency_level: string;
  preferred_contact: string;
  status: string;
  created_at: string;
  user_id: string | null;
}

interface MentorRequest {
  id: string;
  request_type: string;
  description: string;
  status: string;
  created_at: string;
  user_id: string | null;
}

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [bullyingReports, setBullyingReports] = useState<BullyingReport[]>([]);
  const [counselorRequests, setCounselorRequests] = useState<CounselorRequest[]>([]);
  const [mentorRequests, setMentorRequests] = useState<MentorRequest[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementSchool, setAnnouncementSchool] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchBullyingReports(),
      fetchCounselorRequests(),
      fetchMentorRequests(),
      fetchAnnouncements(),
    ]);
    setLoading(false);
  };

  const fetchBullyingReports = async () => {
    const { data } = await supabase
      .from("bullying_reports")
      .select("*")
      .order("created_at", { ascending: false });
    setBullyingReports(data || []);
  };

  const fetchCounselorRequests = async () => {
    const { data } = await supabase
      .from("counselor_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setCounselorRequests(data || []);
  };

  const fetchMentorRequests = async () => {
    const { data } = await supabase
      .from("mentor_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setMentorRequests(data || []);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  const updateReportStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("bullying_reports")
      .update({ status })
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success("Status updated"); fetchBullyingReports(); }
  };

  const updateCounselorStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("counselor_requests")
      .update({ status })
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success("Status updated"); fetchCounselorRequests(); }
  };

  const updateMentorStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("mentor_requests")
      .update({ status })
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success("Status updated"); fetchMentorRequests(); }
  };

  const publishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim() || !announcementSchool.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setPublishing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPublishing(false); return; }

    const { error } = await supabase.from("announcements").insert({
      author_id: session.user.id,
      school: announcementSchool,
      title: announcementTitle,
      content: announcementContent,
    });

    if (error) toast.error("Failed to publish");
    else {
      toast.success("Announcement published!");
      setAnnouncementTitle("");
      setAnnouncementContent("");
      fetchAnnouncements();
    }
    setPublishing(false);
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchAnnouncements(); }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "high": case "urgent": return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "medium": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default: return "bg-green-500/10 text-green-700 dark:text-green-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved": case "completed": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "in-progress": case "reviewing": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default: return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingReports = bullyingReports.filter(r => r.status === "pending").length;
  const pendingCounselor = counselorRequests.filter(r => r.status === "pending").length;
  const pendingMentor = mentorRequests.filter(r => r.status === "pending").length;
  const urgentReports = bullyingReports.filter(r => r.is_urgent && r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-2" />
          <p className="text-2xl font-bold">{urgentReports}</p>
          <p className="text-xs text-muted-foreground">Urgent Reports</p>
        </Card>
        <Card className="p-4 text-center">
          <Shield className="h-6 w-6 mx-auto text-cyan-500 mb-2" />
          <p className="text-2xl font-bold">{pendingReports}</p>
          <p className="text-xs text-muted-foreground">Pending Reports</p>
        </Card>
        <Card className="p-4 text-center">
          <MessageSquare className="h-6 w-6 mx-auto text-purple-500 mb-2" />
          <p className="text-2xl font-bold">{pendingCounselor}</p>
          <p className="text-xs text-muted-foreground">Counselor Requests</p>
        </Card>
        <Card className="p-4 text-center">
          <UserCheck className="h-6 w-6 mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold">{pendingMentor}</p>
          <p className="text-xs text-muted-foreground">Mentor Requests</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Reports</TabsTrigger>
          <TabsTrigger value="counselor">Counselor</TabsTrigger>
          <TabsTrigger value="mentor">Mentor</TabsTrigger>
          <TabsTrigger value="announcements">Announce</TabsTrigger>
        </TabsList>

        {/* Bullying Reports */}
        <TabsContent value="overview" className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Bullying Reports ({bullyingReports.length})
          </h3>
          {bullyingReports.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">No reports submitted</Card>
          ) : (
            bullyingReports.map((report) => (
              <Card key={report.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      <Badge variant="secondary">{report.incident_type}</Badge>
                      {report.is_urgent && (
                        <Badge variant="destructive">URGENT</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-2">{report.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Select onValueChange={(v) => updateReportStatus(report.id, v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Update" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Counselor Requests */}
        <TabsContent value="counselor" className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Counselor Requests ({counselorRequests.length})
          </h3>
          {counselorRequests.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">No requests</Card>
          ) : (
            counselorRequests.map((req) => (
              <Card key={req.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={getStatusColor(req.status)}>
                        {req.status}
                      </Badge>
                      <Badge variant="secondary" className={getUrgencyColor(req.urgency_level)}>
                        {req.urgency_level}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{req.reason}</p>
                    <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact: {req.preferred_contact} • {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Select onValueChange={(v) => updateCounselorStatus(req.id, v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Update" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Mentor Requests */}
        <TabsContent value="mentor" className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5" /> Mentor Requests ({mentorRequests.length})
          </h3>
          {mentorRequests.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">No requests</Card>
          ) : (
            mentorRequests.map((req) => (
              <Card key={req.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={getStatusColor(req.status)}>
                        {req.status}
                      </Badge>
                      <Badge variant="secondary">{req.request_type}</Badge>
                    </div>
                    <p className="text-sm mt-2">{req.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Select onValueChange={(v) => updateMentorStatus(req.id, v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Update" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> Post Announcement
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>School Name</Label>
                <Input
                  value={announcementSchool}
                  onChange={(e) => setAnnouncementSchool(e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Announcement title"
                />
              </div>
              <div className="space-y-1">
                <Label>Content</Label>
                <Textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Write your announcement..."
                  rows={4}
                />
              </div>
              <Button onClick={publishAnnouncement} disabled={publishing} className="w-full">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
                Publish
              </Button>
            </div>
          </Card>

          {/* Existing Announcements */}
          {announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{a.title}</h4>
                    {a.is_pinned && <Badge variant="secondary">Pinned</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {a.school} • {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteAnnouncement(a.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
