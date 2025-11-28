import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Newspaper, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewsItem {
  title: string;
  summary: string;
  content: string;
  category: string;
  imagePrompt: string;
  imageUrl?: string;
}

export const NewsCarousel = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-news', {
        body: { provider: 'lovable' }
      });

      if (error) throw error;

      const newsItems = data.news || [];
      setNews(newsItems);

      // Generate images only for first 2 news items to speed up loading
      newsItems.slice(0, 2).forEach((item: NewsItem, index: number) => {
        generateNewsImage(item.imagePrompt, index);
      });
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const generateNewsImage = async (prompt: string, index: number) => {
    try {
      setImageLoading(prev => ({ ...prev, [index]: true }));
      
      const { data, error } = await supabase.functions.invoke('generate-quiz-image', {
        body: { prompt }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setNews(prev => prev.map((item, i) => 
          i === index ? { ...item, imageUrl: data.imageUrl } : item
        ));
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setImageLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Student News</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-80 rounded-2xl flex-shrink-0" />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Student News</h2>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {news.map((item, index) => (
              <Card
                key={index}
                className="w-80 flex-shrink-0 overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2"
                onClick={() => setSelectedNews(item)}
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
                  {imageLoading[index] ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Skeleton className="w-full h-full" />
                    </div>
                  ) : item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-card/90 backdrop-blur-sm text-card-foreground border">
                      {item.category}
                    </Badge>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.summary}
                  </p>
                </div>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          {selectedNews && (
            <div className="flex flex-col h-full">
              <div className="relative h-64 overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
                {selectedNews.imageUrl ? (
                  <img 
                    src={selectedNews.imageUrl} 
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Newspaper className="w-24 h-24 text-muted-foreground/30" />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm hover:bg-card"
                  onClick={() => setSelectedNews(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-4 left-6">
                  <Badge className="bg-card/90 backdrop-blur-sm text-card-foreground border text-base px-3 py-1">
                    {selectedNews.category}
                  </Badge>
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-8">
                  <h2 className="text-3xl font-bold mb-4 text-foreground">
                    {selectedNews.title}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    {selectedNews.summary}
                  </p>
                  <div className="prose prose-lg max-w-none">
                    {selectedNews.content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 text-foreground/90 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
