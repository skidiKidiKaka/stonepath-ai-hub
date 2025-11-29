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

    const body = await req.json().catch(() => ({}));
    const { page = 1 } = body;
    
    // Student-relevant categories
    const categories = ['technology', 'science', 'health', 'entertainment', 'sports', 'business'];
    
    console.log(`Fetching news for page ${page}`);
    
    // Fetch from multiple categories to get diverse content
    const fetchPromises = categories.map(category => 
      fetch(`https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=2&apiKey=${NEWS_API_KEY}`)
        .then(res => {
          console.log(`Response from ${category}: status ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.status === 'error') {
            console.error(`API error for ${category}:`, data.message);
            // Check for rate limit
            if (data.code === 'rateLimited') {
              throw new Error('NewsAPI rate limit exceeded. Please try again later or upgrade your API plan.');
            }
          }
          console.log(`${category}: ${data.articles?.length || 0} articles`);
          return {
            category,
            articles: data.articles || []
          };
        })
        .catch(err => {
          console.error(`Error fetching ${category}:`, err);
          return { category, articles: [] };
        })
    );

    const results = await Promise.all(fetchPromises);
    
    // Combine and shuffle articles from all categories
    let allArticles: any[] = [];
    results.forEach(result => {
      const articlesWithCategory = result.articles.map((article: any) => ({
        ...article,
        categoryLabel: result.category.charAt(0).toUpperCase() + result.category.slice(1)
      }));
      allArticles = allArticles.concat(articlesWithCategory);
    });
    
    // Shuffle array for variety
    allArticles.sort(() => Math.random() - 0.5);
    
    console.log(`Fetched ${allArticles.length} total articles`);
    
    if (allArticles.length === 0) {
      // Provide more helpful error message
      return new Response(
        JSON.stringify({ 
          error: 'No articles available. This might be due to NewsAPI rate limits. Please try again in a few minutes.',
          news: [],
          hasMore: false
        }),
        { 
          status: 200, // Return 200 to prevent error display, but with empty news array
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Paginate: 7 articles per page
    const articlesPerPage = 7;
    const startIndex = (page - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;
    const paginatedArticles = allArticles.slice(startIndex, endIndex);

    // Transform news articles to match our format
    const newsItems = paginatedArticles.map((article: any) => ({
      title: article.title,
      summary: article.description || article.title,
      content: article.content || article.description || 'Read more at the source.',
      category: article.categoryLabel,
      imageUrl: article.urlToImage || null,
      sourceUrl: article.url,
      publishedAt: article.publishedAt,
      source: article.source?.name || 'News Source'
    }));

    return new Response(
      JSON.stringify({ 
        news: newsItems,
        hasMore: allArticles.length > endIndex
      }),
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
