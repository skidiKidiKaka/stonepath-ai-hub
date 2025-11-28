import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
    if (!NEWS_API_KEY) {
      throw new Error('NEWS_API_KEY not configured');
    }

    // Fetch top headlines for student-relevant categories
    const categories = ['technology', 'science', 'health', 'entertainment', 'sports'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    console.log(`Fetching news from category: ${randomCategory}`);
    
    const newsApiUrl = `https://newsapi.org/v2/top-headlines?country=us&category=${randomCategory}&pageSize=5&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(newsApiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('NewsAPI error:', response.status, errorText);
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.articles?.length || 0} articles`);
    
    if (!data.articles || data.articles.length === 0) {
      throw new Error('No articles found');
    }

    // Transform news articles to match our format
    const newsItems = data.articles.slice(0, 3).map((article: any) => ({
      title: article.title,
      summary: article.description || article.title,
      content: article.content || article.description || 'Read more at the source.',
      category: randomCategory.charAt(0).toUpperCase() + randomCategory.slice(1),
      imageUrl: article.urlToImage || null,
      sourceUrl: article.url,
      publishedAt: article.publishedAt,
      source: article.source?.name || 'News Source'
    }));

    return new Response(
      JSON.stringify({ news: newsItems }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-real-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
