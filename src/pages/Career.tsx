import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Target, TrendingUp, FileText, Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type QuizAnswer = {
  questionId: number;
  answer: string;
};

type CareerResult = {
  type: string;
  feedback: string;
  careers: string[];
  quote: string;
};

const quizQuestions = [
  {
    id: 1,
    question: "What energizes you the most?",
    options: ["Working with people", "Solving complex problems", "Creating something new", "Organizing and planning"],
  },
  {
    id: 2,
    question: "How do you prefer to work?",
    options: ["In a team", "Independently", "Leading others", "Following a structured process"],
  },
  {
    id: 3,
    question: "What's your ideal work environment?",
    options: ["Dynamic and social", "Quiet and focused", "Creative and flexible", "Structured and organized"],
  },
  {
    id: 4,
    question: "What motivates you most?",
    options: ["Helping others", "Solving challenges", "Innovation and creativity", "Achievement and success"],
  },
  {
    id: 5,
    question: "How do you handle stress?",
    options: ["Talk it out with others", "Analyze and strategize", "Take a creative break", "Make a detailed plan"],
  },
  {
    id: 6,
    question: "What's your learning style?",
    options: ["Interactive discussions", "Research and reading", "Hands-on experimentation", "Step-by-step instructions"],
  },
  {
    id: 7,
    question: "What type of tasks do you enjoy?",
    options: ["Communication and networking", "Analysis and problem-solving", "Design and innovation", "Planning and execution"],
  },
  {
    id: 8,
    question: "How do you make decisions?",
    options: ["Consulting with others", "Logical analysis", "Intuition and creativity", "Data and established processes"],
  },
  {
    id: 9,
    question: "What's your ideal project?",
    options: ["Community-focused", "Technical challenge", "Creative endeavor", "Strategic initiative"],
  },
  {
    id: 10,
    question: "What skills do you value most?",
    options: ["Interpersonal skills", "Critical thinking", "Creativity", "Organization"],
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
      type: "The Connector",
      feedback: "You thrive in social environments and excel at building relationships. Your strength lies in understanding people and facilitating collaboration.",
      careers: ["Human Resources Manager", "Marketing Specialist", "Social Worker", "Teacher", "Event Coordinator"],
      quote: "Success is best when it's shared. Your ability to connect people creates endless opportunities.",
    };
  } else if (scores.analytical === maxScore) {
    return {
      type: "The Analyst",
      feedback: "You have a sharp analytical mind and love solving complex problems. Your logical approach makes you excellent at finding optimal solutions.",
      careers: ["Data Scientist", "Software Engineer", "Financial Analyst", "Research Scientist", "Consultant"],
      quote: "Logic will get you from A to B. Imagination will take you everywhere. - Albert Einstein",
    };
  } else if (scores.creative === maxScore) {
    return {
      type: "The Innovator",
      feedback: "You're driven by creativity and innovation. Your ability to think outside the box leads to groundbreaking ideas and unique solutions.",
      careers: ["Graphic Designer", "Product Manager", "Entrepreneur", "Content Creator", "Architect"],
      quote: "Creativity is intelligence having fun. Your innovative spirit will shape the future.",
    };
  } else {
    return {
      type: "The Organizer",
      feedback: "You excel at creating structure and efficiency. Your organizational skills and attention to detail ensure everything runs smoothly.",
      careers: ["Project Manager", "Operations Manager", "Business Analyst", "Supply Chain Manager", "Executive Assistant"],
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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkUser();
  }, []);

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, { questionId: quizQuestions[currentQuestion].id, answer }];
    setAnswers(newAnswers);

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const calculatedResult = calculateResult(newAnswers);
      setResult(calculatedResult);
      setQuizCompleted(true);
      saveResult(newAnswers, calculatedResult);
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
      result_type: calculatedResult.type,
      feedback: calculatedResult.feedback,
      recommended_careers: calculatedResult.careers,
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

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setQuizCompleted(false);
    setResult(null);
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

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quiz">Personality Quiz</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
                    <Button variant="outline" className="w-full justify-start">
                      Resume Templates
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Interview Prep Guide
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Career Exploration Tools
                    </Button>
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
          </TabsContent>

          <TabsContent value="quiz" className="space-y-6">
            {!quizCompleted ? (
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
                      <CardTitle className="text-2xl">Your Career Personality: {result?.type}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-orange-500/10 rounded-lg">
                      <p className="text-sm italic">"{result?.quote}"</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Personality Feedback</h4>
                      <p className="text-muted-foreground">{result?.feedback}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Career Paths</CardTitle>
                    <CardDescription>Based on your personality profile</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {result?.careers.map((career, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg bg-card hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-orange-500" />
                            <span className="font-medium">{career}</span>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Career;
