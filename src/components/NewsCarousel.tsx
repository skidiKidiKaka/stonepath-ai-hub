import { useEffect, useState, useRef } from "react";
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
  imageUrl?: string;
  sourceUrl?: string;
  publishedAt?: string;
  source?: string;
}

export const NewsCarousel = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNews(1);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page]);

  const fetchNews = async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const { data, error } = await supabase.functions.invoke('fetch-real-news', {
        body: { page: pageNum }
      });

      if (error) {
        console.error('Error fetching news:', error);
        throw new Error(error.message || 'Failed to fetch news');
      }

      // Handle rate limit or API issues
      if (data.error) {
        console.warn('News API issue:', data.error);
        toast.error(data.error);
        setHasMore(false);
        return;
      }

      const newsItems = data.news || [];
      setHasMore(data.hasMore || false);
      
      if (append) {
        setNews(prev => [...prev, ...newsItems]);
      } else {
        setNews(newsItems);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load news';
      toast.error('Failed to load news. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreNews = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNews(nextPage, true);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current || loadingMore || !hasMore) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Load more when user is near the end (90% scrolled)
    if (scrollLeft + clientWidth >= scrollWidth * 0.9) {
      loadMoreNews();
    }
  };


  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Student News</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap" ref={scrollContainerRef}>
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

  if (news.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Student News</h2>
        </div>
        <Card className="p-8 text-center">
          <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No News Available</h3>
          <p className="text-sm text-muted-foreground">
            News is temporarily unavailable. This might be due to API rate limits. Please check back later.
          </p>
        </Card>
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
        
        <ScrollArea className="w-full whitespace-nowrap" ref={scrollContainerRef}>
          <div className="flex gap-4 pb-4">
            {news.map((item, index) => (
              <Card
                key={index}
                className="w-80 flex-shrink-0 overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2"
                onClick={() => setSelectedNews(item)}
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center fallback-icon" style={{ display: item.imageUrl ? 'none' : 'flex' }}>
                    <Newspaper className="w-16 h-16 text-muted-foreground/30" />
                  </div>
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
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {item.summary}
                  </p>
                  {item.source && (
                    <p className="text-xs text-muted-foreground/70">
                      {item.source}
                    </p>
                  )}
                </div>
              </Card>
            ))}
            {loadingMore && (
              <Card className="w-80 flex-shrink-0 h-72 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">Loading more news...</p>
                </div>
              </Card>
            )}
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
