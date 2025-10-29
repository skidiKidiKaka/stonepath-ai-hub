import { useState } from "react";
import { Download, Edit2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type ResumeData = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  education: Array<{ school: string; degree: string; location: string; dates: string }>;
  experience: Array<{ title: string; company: string; location: string; dates: string; bullets: string[] }>;
  projects: Array<{ name: string; tech: string; dates: string; bullets: string[] }>;
  skills: { languages: string; frameworks: string; tools: string; libraries: string };
};

const defaultResumeData: ResumeData = {
  name: "Jake Ryan",
  email: "jake@su.edu",
  phone: "123-456-7890",
  linkedin: "linkedin.com/in/jake",
  github: "github.com/jake",
  education: [
    {
      school: "Southwestern University",
      degree: "Bachelor of Arts in Computer Science, Minor in Business",
      location: "Georgetown, TX",
      dates: "Aug. 2018 – May 2021"
    },
    {
      school: "Blinn College",
      degree: "Associate's in Liberal Arts",
      location: "Bryan, TX",
      dates: "Aug. 2014 – May 2018"
    }
  ],
  experience: [
    {
      title: "Undergraduate Research Assistant",
      company: "Texas A&M University",
      location: "College Station, TX",
      dates: "June 2020 – Present",
      bullets: [
        "Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems",
        "Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data",
        "Explored ways to visualize GitHub collaboration in a classroom setting"
      ]
    },
    {
      title: "Information Technology Support Specialist",
      company: "Southwestern University",
      location: "Georgetown, TX",
      dates: "Sep. 2018 – Present",
      bullets: [
        "Communicate with managers to set up campus computers used on campus",
        "Assess and troubleshoot computer problems brought by students, faculty and staff",
        "Maintain upkeep of computers, classroom equipment, and 200 printers across campus"
      ]
    },
    {
      title: "Artificial Intelligence Research Assistant",
      company: "Southwestern University",
      location: "Georgetown, TX",
      dates: "May 2019 – July 2019",
      bullets: [
        "Explored methods to generate video game dungeons based off of The Legend of Zelda",
        "Developed a game in Java to test the generated dungeons",
        "Contributed 50K+ lines of code to an established codebase via Git",
        "Conducted a human subject study to determine which video game dungeon generation technique is enjoyable",
        "Wrote an 8-page paper and gave multiple presentations on-campus",
        "Presented virtually to the World Conference on Computational Intelligence"
      ]
    }
  ],
  projects: [
    {
      name: "Gitlytics",
      tech: "Python, Flask, React, PostgreSQL, Docker",
      dates: "June 2020 – Present",
      bullets: [
        "Developed a full-stack web application using with Flask serving a REST API with React as the frontend",
        "Implemented GitHub OAuth to get data from user's repositories",
        "Visualized GitHub data to show collaboration",
        "Used Celery and Redis for asynchronous tasks"
      ]
    },
    {
      name: "Simple Paintball",
      tech: "Spigot API, Java, Maven, TravisCI, Git",
      dates: "May 2018 – May 2020",
      bullets: [
        "Developed a Minecraft server plugin to entertain kids during free time for a previous job",
        "Published plugin to websites gaining 2K+ downloads and an average 4.5/5-star review",
        "Implemented continuous delivery using TravisCI to build the plugin upon new a release",
        "Collaborated with Minecraft server administrators to suggest features and get feedback about the plugin"
      ]
    }
  ],
  skills: {
    languages: "Java, Python, C/C++, SQL (Postgres), JavaScript, HTML/CSS, R",
    frameworks: "React, Node.js, Flask, JUnit, WordPress, Material-UI, FastAPI",
    tools: "Git, Docker, TravisCI, Google Cloud Platform, VS Code, Visual Studio, PyCharm, IntelliJ, Eclipse",
    libraries: "pandas, NumPy, Matplotlib"
  }
};

export const ResumeBuilder = () => {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "/resume-template.docx";
    link.download = "resume-template.docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: "Your resume template is downloading...",
    });
  };

  const updateField = (field: keyof ResumeData, value: any) => {
    setResumeData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          Resume Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Resume Template</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isEditing ? "default" : "outline"}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <Eye className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
                {isEditing ? "Preview" : "Edit"}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={resumeData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={resumeData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={resumeData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>LinkedIn</Label>
                      <Input
                        value={resumeData.linkedin}
                        onChange={(e) => updateField("linkedin", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Technical Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Languages</Label>
                    <Textarea
                      value={resumeData.skills.languages}
                      onChange={(e) => updateField("skills", { ...resumeData.skills, languages: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Frameworks</Label>
                    <Textarea
                      value={resumeData.skills.frameworks}
                      onChange={(e) => updateField("skills", { ...resumeData.skills, frameworks: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Preview Mode
            <div className="space-y-6 bg-card p-8 rounded-lg border">
              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">{resumeData.name}</h1>
                <div className="flex justify-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <span>{resumeData.phone}</span>
                  <span>|</span>
                  <span>{resumeData.email}</span>
                  <span>|</span>
                  <span>{resumeData.linkedin}</span>
                  <span>|</span>
                  <span>{resumeData.github}</span>
                </div>
              </div>

              <Separator />

              {/* Education */}
              <div>
                <h2 className="text-xl font-bold mb-3">EDUCATION</h2>
                {resumeData.education.map((edu, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">{edu.school}</span>
                      <span className="text-muted-foreground">{edu.location}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{edu.degree}</span>
                      <span className="text-muted-foreground">{edu.dates}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Experience */}
              <div>
                <h2 className="text-xl font-bold mb-3">EXPERIENCE</h2>
                {resumeData.experience.map((exp, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="flex justify-between">
                      <span className="font-semibold">{exp.title}</span>
                      <span className="text-muted-foreground">{exp.dates}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="italic">{exp.company}</span>
                      <span className="text-muted-foreground">{exp.location}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {exp.bullets.map((bullet, bidx) => (
                        <li key={bidx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Projects */}
              <div>
                <h2 className="text-xl font-bold mb-3">PROJECTS</h2>
                {resumeData.projects.map((proj, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="flex justify-between">
                      <span className="font-semibold">{proj.name}</span>
                      <span className="text-muted-foreground">{proj.dates}</span>
                    </div>
                    <div className="text-sm italic mb-2">{proj.tech}</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {proj.bullets.map((bullet, bidx) => (
                        <li key={bidx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Technical Skills */}
              <div>
                <h2 className="text-xl font-bold mb-3">TECHNICAL SKILLS</h2>
                <div className="space-y-1 text-sm">
                  <div><span className="font-semibold">Languages:</span> {resumeData.skills.languages}</div>
                  <div><span className="font-semibold">Frameworks:</span> {resumeData.skills.frameworks}</div>
                  <div><span className="font-semibold">Developer Tools:</span> {resumeData.skills.tools}</div>
                  <div><span className="font-semibold">Libraries:</span> {resumeData.skills.libraries}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
