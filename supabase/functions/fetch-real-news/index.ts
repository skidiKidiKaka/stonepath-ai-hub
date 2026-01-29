import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchFromNewsAPI(apiKey: string, page: number): Promise<any[]> {
  const categories = ['technology', 'science', 'health', 'entertainment', 'sports', 'business'];
  
  try {
    const fetchPromises = categories.map(category => 
      fetch(`https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=2&apiKey=${apiKey}`)
        .then(res => {
          console.log(`NewsAPI ${category}: status ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.status === 'error') {
            console.error(`NewsAPI error for ${category}:`, data.message);
            if (data.code === 'rateLimited') {
              throw new Error('NewsAPI rate limited');
            }
          }
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
    
    let allArticles: any[] = [];
    results.forEach(result => {
      const articlesWithCategory = result.articles.map((article: any) => ({
        ...article,
        categoryLabel: result.category.charAt(0).toUpperCase() + result.category.slice(1)
      }));
      allArticles = allArticles.concat(articlesWithCategory);
    });
    
    allArticles.sort(() => Math.random() - 0.5);
    return allArticles;
  } catch (error) {
    console.error('NewsAPI failed:', error);
    return [];
  }
}

async function fetchFromNewsData(apiKey: string, page: number): Promise<any[]> {
  const categories = ['technology', 'science', 'health', 'entertainment', 'sports', 'business'];
  
  try {
    const fetchPromises = categories.map(category => 
      fetch(`https://newsdata.io/api/1/news?apikey=${apiKey}&category=${category}&country=us&language=en&size=2`)
        .then(res => {
          console.log(`NewsData.io ${category}: status ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.status === 'error') {
            console.error(`NewsData.io error for ${category}:`, data.message);
            return { category, articles: [] };
          }
          return {
            category,
            articles: data.results || []
          };
        })
        .catch(err => {
          console.error(`Error fetching ${category}:`, err);
          return { category, articles: [] };
        })
    );

    const results = await Promise.all(fetchPromises);
    
    let allArticles: any[] = [];
    results.forEach(result => {
      const articlesWithCategory = result.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        content: article.content || article.description,
        image_url: article.image_url,
        link: article.link,
        pubDate: article.pubDate,
        source_id: article.source_id,
        categoryLabel: result.category.charAt(0).toUpperCase() + result.category.slice(1)
      }));
      allArticles = allArticles.concat(articlesWithCategory);
    });
    
    allArticles.sort(() => Math.random() - 0.5);
    return allArticles;
  } catch (error) {
    console.error('NewsData.io failed:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Real news fetch request from user: ${userId}`);

    const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
    const NEWSDATA_API_KEY = Deno.env.get('NEWSDATA_API_KEY');
    
    if (!NEWS_API_KEY && !NEWSDATA_API_KEY) {
      throw new Error('No news API keys configured');
    }

    const body = await req.json().catch(() => ({}));
    const { page = 1 } = body;
    
    let allArticles: any[] = [];
    let source = 'NewsAPI';
    
    // Try NewsAPI first
    if (NEWS_API_KEY) {
      console.log('Trying NewsAPI...');
      allArticles = await fetchFromNewsAPI(NEWS_API_KEY, page);
    }
    
    // Fall back to NewsData.io if NewsAPI failed or returned no results
    if (allArticles.length === 0 && NEWSDATA_API_KEY) {
      console.log('Falling back to NewsData.io...');
      allArticles = await fetchFromNewsData(NEWSDATA_API_KEY, page);
      source = 'NewsData.io';
    }
    
    console.log(`Fetched ${allArticles.length} total articles from ${source}`);
    
    if (allArticles.length === 0) {
      // Provide more helpful error message
      return new Response(
        JSON.stringify({ 
          error: 'No articles available. This might be due to API rate limits. Please try again in a few minutes.',
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
      imageUrl: article.urlToImage || article.image_url || null,
      sourceUrl: article.url || article.link,
      publishedAt: article.publishedAt || article.pubDate,
      source: article.source?.name || article.source_id || 'News Source'
    }));

    return new Response(
      JSON.stringify({ 
        news: newsItems,
        hasMore: allArticles.length > endIndex,
        source
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
