import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Target, TrendingUp, FileText, Award, Sparkles, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ResumeBuilder } from "@/components/ResumeBuilder";
import { QuizGame } from "@/components/QuizGame";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type QuizAnswer = {
  questionId: number;
  question: string;
  answer: string;
};

type CareerResult = {
  resultType: string;
  feedback: string;
  traits?: string[];
  strengths?: { [key: string]: number };
  recommendedCareers: string[];
  recommendedClubs: string[];
  quote: string;
};

const quizQuestions = [
  {
    id: 1,
    question: "When you're thrown into a group project, what role do you naturally gravitate toward?",
    options: ["The one who keeps everyone vibing and communicating", "The mastermind who solves the hardest problems", "The visionary with all the cool ideas", "The planner who makes sure nothing falls through the cracks", "The one who does a bit of everything"],
  },
  {
    id: 2,
    question: "It's Friday night. What sounds most appealing?",
    options: ["Hanging out with friends and meeting new people", "Getting lost in a book, game, or solo hobby", "Working on a passion project or creative pursuit", "Organizing something for the weekend or planning ahead", "Honestly? Netflix and chill with snacks"],
  },
  {
    id: 3,
    question: "Your teacher says 'work however you want.' What do you do?",
    options: ["Form a study group immediately", "Lock in solo mode with headphones on", "Experiment with different approaches until something clicks", "Create a detailed schedule and checklist", "Mix it up depending on my mood"],
  },
  {
    id: 4,
    question: "What kind of feedback actually helps you improve?",
    options: ["Direct conversation with someone I trust", "Written notes I can analyze at my own pace", "Creative suggestions that spark new ideas", "Clear, actionable steps and metrics", "A combination of different feedback types"],
  },
  {
    id: 5,
    question: "You're stuck on a problem. What's your move?",
    options: ["Ask for help or brainstorm with others", "Research it obsessively until I figure it out", "Take a break and let my subconscious work on it", "Break it down into smaller, manageable steps", "Try multiple approaches and see what works"],
  },
  {
    id: 6,
    question: "What's your definition of success?",
    options: ["Making a positive impact on people's lives", "Mastering complex skills and knowledge", "Creating something unique that didn't exist before", "Achieving measurable goals and recognition", "Finding balance and happiness in what I do"],
  },
  {
    id: 7,
    question: "When watching a movie or show, what do you pay attention to most?",
    options: ["The characters and their relationships", "The plot twists and logical consistency", "The cinematography, music, and artistic choices", "The story structure and pacing", "I just vibe with whatever catches my interest"],
  },
  {
    id: 8,
    question: "How do you handle a tight deadline?",
    options: ["Rally the team and divide the work", "Hyperfocus and power through alone", "Use the pressure to fuel creative breakthroughs", "Execute my pre-planned strategy efficiently", "Adapt my approach based on what needs to happen"],
  },
  {
    id: 9,
    question: "What subject or activity makes you lose track of time?",
    options: ["Anything involving people, communication, or social dynamics", "Puzzles, logic problems, or technical deep-dives", "Art, music, writing, or any creative outlet", "Planning events, organizing systems, or strategizing", "It varies - I'm interested in multiple things"],
  },
  {
    id: 10,
    question: "You have a free period. What are you most likely doing?",
    options: ["Chatting with friends or helping someone out", "Reading, coding, or diving into research", "Doodling, writing, or working on a creative project", "Catching up on assignments or planning ahead", "Depends on the day - could be anything"],
  },
  {
    id: 11,
    question: "What's your relationship with rules and structure?",
    options: ["I see them as guidelines that help people work together", "I follow them if they make logical sense", "I bend them when creativity demands it", "I appreciate them - they create order and efficiency", "I'm flexible - some rules matter, some don't"],
  },
  {
    id: 12,
    question: "If you could skip one type of task forever, what would it be?",
    options: ["Working alone for long periods without social interaction", "Dealing with vague, illogical, or messy information", "Following rigid procedures with no room for creativity", "Unplanned, chaotic situations with no clear structure", "Honestly, I can handle most things if I'm interested"],
  },
  {
    id: 13,
    question: "What's your ideal career environment?",
    options: ["Collaborative with diverse people and strong team culture", "Challenging with complex problems to solve", "Dynamic with freedom to innovate and experiment", "Organized with clear goals and advancement paths", "Flexible with variety and autonomy"],
  },
  {
    id: 14,
    question: "When you accomplish something big, what matters most?",
    options: ["Seeing how it helps or inspires others", "Knowing I solved something difficult", "The satisfaction of creating something original", "Hitting my goals and receiving recognition", "Personal growth and learning from the experience"],
  },
  {
    id: 15,
    question: "What drains your energy the fastest?",
    options: ["Working in isolation with no human interaction", "Repetitive tasks that don't engage my brain", "Rigid environments with no creative freedom", "Chaos and lack of clear direction or planning", "Being forced to do the same thing all the time"],
  },
];

const calculateResult = (answers: QuizAnswer[]): CareerResult => {
  const scores = { people: 0, analytical: 0, creative: 0, structured: 0 };
  
  answers.forEach((answer) => {
    const optionIndex = quizQuestions
      .find((q) => q.id === answer.questionId)
      ?.options.indexOf(answer.answer);
    
    if (optionIndex === 0) scores.people++;
    else if (optionIndex === 1) scores.analytical++;
    else if (optionIndex === 2) scores.creative++;
    else if (optionIndex === 3) scores.structured++;
  });

  const maxScore = Math.max(scores.people, scores.analytical, scores.creative, scores.structured);
  
  if (scores.people === maxScore) {
    return {
      resultType: "The Connector",
      feedback: "You thrive in social environments and excel at building relationships. Your strength lies in understanding people and facilitating collaboration.",
      recommendedCareers: ["Human Resources Manager", "Marketing Specialist", "Social Worker", "Teacher", "Event Coordinator"],
      recommendedClubs: ["Student Government", "Peer Mentoring", "Drama Club", "Debate Team", "Community Service Club"],
      quote: "Success is best when it's shared. Your ability to connect people creates endless opportunities.",
    };
  } else if (scores.analytical === maxScore) {
    return {
      resultType: "The Analyst",
      feedback: "You have a sharp analytical mind and love solving complex problems. Your logical approach makes you excellent at finding optimal solutions.",
      recommendedCareers: ["Data Scientist", "Software Engineer", "Financial Analyst", "Research Scientist", "Consultant"],
      recommendedClubs: ["Math Club", "Science Olympiad", "Chess Club", "Coding Club", "Robotics Team"],
      quote: "Logic will get you from A to B. Imagination will take you everywhere. - Albert Einstein",
    };
  } else if (scores.creative === maxScore) {
    return {
      resultType: "The Innovator",
      feedback: "You're driven by creativity and innovation. Your ability to think outside the box leads to groundbreaking ideas and unique solutions.",
      recommendedCareers: ["Graphic Designer", "Product Manager", "Entrepreneur", "Content Creator", "Architect"],
      recommendedClubs: ["Art Club", "Drama Club", "Yearbook", "Creative Writing", "Entrepreneurship Club"],
      quote: "Creativity is intelligence having fun. Your innovative spirit will shape the future.",
    };
  } else {
    return {
      resultType: "The Organizer",
      feedback: "You excel at creating structure and efficiency. Your organizational skills and attention to detail ensure everything runs smoothly.",
      recommendedCareers: ["Project Manager", "Operations Manager", "Business Analyst", "Supply Chain Manager", "Executive Assistant"],
      recommendedClubs: ["Student Government", "Model UN", "Business Club", "Event Planning Committee", "National Honor Society"],
      quote: "Order is the foundation of all things. Your organizational skills create stability and success.",
    };
  }
};

const Career = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState<CareerResult | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [careerDetails, setCareerDetails] = useState<string>("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkUser();
  }, []);

  const handleAnswer = async (answer: string) => {
    const newAnswers = [...answers, { 
      questionId: quizQuestions[currentQuestion].id, 
      question: quizQuestions[currentQuestion].question,
      answer 
    }];
    setAnswers(newAnswers);

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-career-insights', {
          body: { answers: newAnswers }
        });

        if (error) throw error;

        const calculatedResult: CareerResult = data;
        setResult(calculatedResult);
        setQuizCompleted(true);
        saveResult(newAnswers, calculatedResult);
      } catch (error) {
        console.error('Error generating career insights:', error);
        toast({
          title: "Error",
          description: "Failed to generate career insights. Please try again.",
          variant: "destructive",
        });
        // Use fallback static result
        const fallbackResult = calculateResult(newAnswers);
        setResult(fallbackResult);
        setQuizCompleted(true);
        saveResult(newAnswers, fallbackResult);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const saveResult = async (quizAnswers: QuizAnswer[], calculatedResult: CareerResult) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to save results",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("career_quiz_results").insert({
      user_id: userId,
      answers: quizAnswers,
      result_type: calculatedResult.resultType,
      feedback: calculatedResult.feedback,
      recommended_careers: calculatedResult.recommendedCareers,
      recommended_clubs: calculatedResult.recommendedClubs || [],
      quote: calculatedResult.quote,
    });

    if (error) {
      toast({
        title: "Error saving results",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Results saved!",
        description: "Your career personality results have been saved.",
      });
    }
  };

  const handleCareerClick = async (career: string) => {
    setSelectedCareer(career);
    setIsLoadingDetails(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-career-details', {
        body: { 
          careerPath: career,
          answers: answers,
          resultType: result?.resultType
        }
      });

      if (error) throw error;

      setCareerDetails(data.details);
    } catch (error) {
      console.error('Error generating career details:', error);
      toast({
        title: "Error",
        description: "Failed to load career details. Please try again.",
        variant: "destructive",
      });
      setCareerDetails("We couldn't load the details for this career path. Please try again later.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setQuizCompleted(false);
    setResult(null);
    setIsGenerating(false);
  };

  // Fallback static result for errors
  const calculateResult = (quizAnswers: QuizAnswer[]): CareerResult => {
    const scores = { people: 0, analytical: 0, creative: 0, structured: 0 };
    
    quizAnswers.forEach((answer) => {
      const optionIndex = quizQuestions
        .find((q) => q.id === answer.questionId)
        ?.options.indexOf(answer.answer);
      
      if (optionIndex === 0) scores.people++;
      else if (optionIndex === 1) scores.analytical++;
      else if (optionIndex === 2) scores.creative++;
      else if (optionIndex === 3) scores.structured++;
    });

    const maxScore = Math.max(scores.people, scores.analytical, scores.creative, scores.structured);
    
    if (scores.people === maxScore) {
      return {
        resultType: "The Connector",
        feedback: "You thrive in social environments and excel at building relationships. Your strength lies in understanding people and facilitating collaboration.",
        recommendedCareers: ["Human Resources Manager", "Marketing Specialist", "Social Worker", "Teacher", "Event Coordinator"],
        recommendedClubs: ["Student Government", "Peer Mentoring", "Drama Club", "Debate Team", "Community Service Club"],
        quote: "Success is best when it's shared. Your ability to connect people creates endless opportunities.",
      };
    } else if (scores.analytical === maxScore) {
      return {
        resultType: "The Analyst",
        feedback: "You have a sharp analytical mind and love solving complex problems. Your logical approach makes you excellent at finding optimal solutions.",
        recommendedCareers: ["Data Scientist", "Software Engineer", "Financial Analyst", "Research Scientist", "Consultant"],
        recommendedClubs: ["Math Club", "Science Olympiad", "Chess Club", "Coding Club", "Robotics Team"],
        quote: "Logic will get you from A to B. Imagination will take you everywhere. - Albert Einstein",
      };
    } else if (scores.creative === maxScore) {
      return {
        resultType: "The Innovator",
        feedback: "You're driven by creativity and innovation. Your ability to think outside the box leads to groundbreaking ideas and unique solutions.",
        recommendedCareers: ["Graphic Designer", "Product Manager", "Entrepreneur", "Content Creator", "Architect"],
        recommendedClubs: ["Art Club", "Drama Club", "Yearbook", "Creative Writing", "Entrepreneurship Club"],
        quote: "Creativity is intelligence having fun. Your innovative spirit will shape the future.",
      };
    } else {
      return {
        resultType: "The Organizer",
        feedback: "You excel at creating structure and efficiency. Your organizational skills and attention to detail ensure everything runs smoothly.",
        recommendedCareers: ["Project Manager", "Operations Manager", "Business Analyst", "Supply Chain Manager", "Executive Assistant"],
        recommendedClubs: ["Student Government", "Model UN", "Business Club", "Event Planning Committee", "National Honor Society"],
        quote: "Order is the foundation of all things. Your organizational skills create stability and success.",
      };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-500/5 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            Career
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                <CardTitle>Career Goals</CardTitle>
              </div>
              <CardDescription>Track your professional development</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Resume Update</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>LinkedIn Profile</span>
                    <span>60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <CardTitle>Skills Development</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Communication</span>
                  <span className="font-semibold">Advanced</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Leadership</span>
                  <span className="font-semibold">Intermediate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Technical Skills</span>
                  <span className="font-semibold">Intermediate</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <CardTitle>Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <ResumeBuilder />
                <Button variant="outline" className="w-full justify-start">
                  Interview Prep Guide
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-500" />
                <CardTitle>Career Exploration Tools</CardTitle>
              </div>
              <CardDescription>Professional networking and job search platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <a 
                    href="https://www.linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h4 className="font-semibold text-orange-500 mb-2">LinkedIn</h4>
                    <p className="text-sm text-muted-foreground">
                      The world's largest professional network. Build your profile, connect with industry professionals, 
                      search for jobs, and showcase your skills and experience.
                    </p>
                  </a>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <a 
                    href="https://www.joinhandshake.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h4 className="font-semibold text-orange-500 mb-2">Handshake</h4>
                    <p className="text-sm text-muted-foreground">
                      Career network for college students and recent grads. Find internships, entry-level jobs, 
                      and connect directly with employers recruiting on campus.
                    </p>
                  </a>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <a 
                    href="https://www.glassdoor.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h4 className="font-semibold text-orange-500 mb-2">Glassdoor</h4>
                    <p className="text-sm text-muted-foreground">
                      Research companies, read employee reviews, see salary information, and find jobs. 
                      Get insider insights before applying or interviewing.
                    </p>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-500" />
                <CardTitle>Career Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Network with professionals in your field</li>
                <li>• Seek internship opportunities</li>
                <li>• Develop both hard and soft skills</li>
                <li>• Stay updated with industry trends</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <QuizGame />

        {isGenerating ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
              <p className="text-lg font-medium">Analyzing your responses...</p>
              <p className="text-sm text-muted-foreground mt-2">Creating your personalized career profile</p>
            </CardContent>
          </Card>
        ) : !quizCompleted ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <CardTitle>Career Personality Quiz</CardTitle>
              </div>
              <CardDescription>
                Question {currentQuestion + 1} of {quizQuestions.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{quizQuestions[currentQuestion].question}</h3>
                <Progress value={(currentQuestion / quizQuestions.length) * 100} className="h-2" />
              </div>
              <div className="grid gap-3">
                {quizQuestions[currentQuestion].options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4"
                    onClick={() => handleAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-orange-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-orange-500" />
                  <CardTitle className="text-2xl">Your Career Personality: {result?.resultType}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {result?.traits && result.traits.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      Your Personality Traits
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.traits.map((trait, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-orange-500/10 rounded-lg">
                  <p className="text-sm italic">"{result?.quote}"</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">The Verdict</h4>
                  <p className="text-muted-foreground">{result?.feedback}</p>
                </div>

                {result?.strengths && Object.keys(result.strengths).length > 0 && (
                  <div className="relative">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-orange-500" />
                      Your Strength Profile
                    </h4>
                    <div className="w-full h-[450px] flex items-center justify-center bg-gradient-to-br from-orange-500/5 via-transparent to-orange-600/5 rounded-xl border border-orange-500/10 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart 
                          data={Object.entries(result.strengths).map(([strength, score]) => ({
                            attribute: strength,
                            value: score,
                            fullMark: 10
                          }))}
                        >
                          <defs>
                            <linearGradient id="colorStrength" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#ea580c" stopOpacity={0.3}/>
                            </linearGradient>
                          </defs>
                          <PolarGrid 
                            stroke="#f97316" 
                            strokeWidth={1.5}
                            strokeOpacity={0.2}
                          />
                          <PolarAngleAxis 
                            dataKey="attribute" 
                            tick={{ 
                              fill: "hsl(var(--foreground))", 
                              fontSize: 13,
                              fontWeight: 600
                            }}
                          />
                          <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 10]}
                            tick={{ 
                              fill: "hsl(var(--muted-foreground))", 
                              fontSize: 11,
                              fontWeight: 500
                            }}
                            stroke="#f97316"
                            strokeOpacity={0.3}
                          />
                          <Radar
                            name="Strength"
                            dataKey="value"
                            stroke="#f97316"
                            fill="url(#colorStrength)"
                            fillOpacity={0.6}
                            strokeWidth={3}
                            dot={{ 
                              fill: "#f97316", 
                              strokeWidth: 2, 
                              r: 5,
                              stroke: "#fff"
                            }}
                            activeDot={{
                              fill: "#ea580c",
                              stroke: "#fff",
                              strokeWidth: 3,
                              r: 7
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 text-center text-xs text-muted-foreground">
                      Your unique strength distribution across key attributes
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Career Paths</CardTitle>
                <CardDescription>Click any career to see why it matches your personality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {result?.recommendedCareers.map((career, index) => (
                    <button
                      key={index}
                      onClick={() => handleCareerClick(career)}
                      className="p-4 border rounded-lg bg-card hover:bg-muted transition-colors text-left w-full"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">{career}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended School Clubs</CardTitle>
                <CardDescription>Clubs that align with your interests and personality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {result?.recommendedClubs.map((club, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">{club}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button onClick={resetQuiz} className="w-full">
              Take Quiz Again
            </Button>
          </div>
        )}

        <Dialog open={selectedCareer !== null} onOpenChange={() => setSelectedCareer(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-500" />
                {selectedCareer}
              </DialogTitle>
              <DialogDescription>
                Why this career matches your personality
              </DialogDescription>
            </DialogHeader>
            {isLoadingDetails ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Generating personalized insights...</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-muted-foreground">{careerDetails}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Career;
