import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Lightbulb, Brain, FileStack, Loader2, Upload } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

interface Flashcard {
  question: string;
  answer: string;
}

interface MindmapBranch {
  title: string;
  subtopics: string[];
}

interface Mindmap {
  central: string;
  branches: MindmapBranch[];
}

export const AiNoteGenerator = () => {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [bullets, setBullets] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [mindmap, setMindmap] = useState<Mindmap | null>(null);
  const [summary, setSummary] = useState("");
  const [activeTab, setActiveTab] = useState("input");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        toast({
          title: "Processing PDF",
          description: "Extracting text from PDF...",
        });

        // Set worker source for PDF.js - use the installed version
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }

        setContent(fullText);
        toast({
          title: "PDF processed",
          description: `Extracted text from ${pdf.numPages} page(s)`,
        });
      } else {
        const text = await file.text();
        setContent(text);
        toast({
          title: "File uploaded",
          description: "File content loaded successfully",
        });
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
    }
  };

  const generateNotes = async (type: string) => {
    if (!content.trim()) {
      toast({
        title: "No content",
        description: "Please enter or upload content first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-notes', {
        body: { content, type }
      });

      if (error) throw error;

      if (type === 'bullets') {
        setBullets(data.content);
        setActiveTab('bullets');
      } else if (type === 'flashcards') {
        try {
          const parsed = JSON.parse(data.content);
          setFlashcards(parsed);
          setActiveTab('flashcards');
        } catch {
          setFlashcards([]);
          toast({
            title: "Error",
            description: "Failed to parse flashcards",
            variant: "destructive",
          });
        }
      } else if (type === 'mindmap') {
        try {
          const parsed = JSON.parse(data.content);
          setMindmap(parsed);
          setActiveTab('mindmap');
        } catch {
          setMindmap(null);
          toast({
            title: "Error",
            description: "Failed to parse mindmap",
            variant: "destructive",
          });
        }
      } else if (type === 'summary') {
        setSummary(data.content);
        setActiveTab('summary');
      }

      toast({
        title: "Success",
        description: "Notes generated successfully",
      });
    } catch (error) {
      console.error('Error generating notes:', error);
      toast({
        title: "Error",
        description: "Failed to generate notes",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-orange-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-semibold">AI Note Generator</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="bullets">Bullets</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="mindmap">Mindmap</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload File or Enter Text</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".txt,.md,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </span>
                </Button>
              </label>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your study material here..."
              className="min-h-[200px]"
            />
          </div>

          <Button
            onClick={() => {
              // If on input tab, default to bullets and switch to bullets tab
              if (activeTab === 'input') {
                generateNotes('bullets');
                setActiveTab('bullets');
              } else if (activeTab === 'bullets') {
                generateNotes('bullets');
              } else if (activeTab === 'flashcards') {
                generateNotes('flashcards');
              } else if (activeTab === 'mindmap') {
                generateNotes('mindmap');
              } else if (activeTab === 'summary') {
                generateNotes('summary');
              }
            }}
            disabled={isGenerating || !content.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                {activeTab === 'input' ? 'Generate Notes' :
                 `Generate ${activeTab === 'bullets' ? 'Bullet Points' : 
                           activeTab === 'flashcards' ? 'Flashcards' :
                           activeTab === 'mindmap' ? 'Mindmap' : 'Summary'}`}
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="bullets">
          <div className="prose prose-sm max-w-none bg-background/50 p-4 rounded-lg border">
            {bullets ? (
              <pre className="whitespace-pre-wrap font-sans">{bullets}</pre>
            ) : (
              <p className="text-muted-foreground">No bullet points generated yet</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="flashcards">
          <div className="space-y-3">
            {flashcards.length > 0 ? (
              flashcards.map((card, index) => (
                <Card key={index} className="p-4 bg-background/50">
                  <div className="space-y-2">
                    <div className="font-semibold text-orange-500">Q: {card.question}</div>
                    <div className="text-sm">A: {card.answer}</div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">No flashcards generated yet</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="mindmap">
          <div className="bg-background/50 p-6 rounded-lg border">
            {mindmap ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-block px-6 py-3 bg-orange-500 text-white rounded-full font-semibold text-lg">
                    {mindmap.central}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {mindmap.branches.map((branch, index) => (
                    <Card key={index} className="p-4 bg-background border-l-4 border-orange-500">
                      <h3 className="font-semibold text-lg mb-2 text-orange-500">{branch.title}</h3>
                      <ul className="space-y-1">
                        {branch.subtopics.map((subtopic, subIndex) => (
                          <li key={subIndex} className="text-sm pl-4 border-l-2 border-muted">
                            {subtopic}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No mindmap generated yet</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="summary">
          <div className="prose prose-sm max-w-none bg-background/50 p-4 rounded-lg border">
            {summary ? (
              <pre className="whitespace-pre-wrap font-sans">{summary}</pre>
            ) : (
              <p className="text-muted-foreground">No summary generated yet</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
