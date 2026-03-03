import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_PEER_UUID = "00000000-0000-0000-0000-000000000001";

// Static question bank (mirrored from frontend data)
const questionBank: Record<string, Array<{question: string; options: string[]; depth: number}>> = {
  "mental health": [
    { depth: 1, question: "When you are stressed, you usually...", options: ["Listen to music", "Talk to someone", "Go for a walk", "Write it down", "Scroll endlessly"] },
    { depth: 1, question: "Your go-to comfort activity after a bad day is...", options: ["Binge-watching something", "Eating comfort food", "Calling a friend", "Sleeping it off", "Working out the frustration"] },
    { depth: 1, question: "If your mood had a weather forecast today, it would be...", options: ["Sunny and clear", "Partly cloudy", "Thunderstorms incoming", "Foggy and confused", "A calm sunset"] },
    { depth: 2, question: "Which thought shows up in your head at 2 AM the most?", options: ["Everyone secretly dislikes me", "I am wasting my life", "I am going to mess everything up", "I feel behind and it is embarrassing", "I do not even know who I am anymore"] },
    { depth: 2, question: "When you are not okay, you usually...", options: ["Disappear and act fine later", "Get mean for no reason", "Get quiet and overthink everything", "Cry alone and hate admitting it", "Stay busy so I do not feel it"] },
    { depth: 2, question: "What hurts you the fastest?", options: ["Being ignored", "Being misunderstood", "Being replaced", "Being talked about", "Being treated like I am too much"] },
    { depth: 3, question: "What is the hardest sentence for you to say out loud?", options: ["I need help", "I am lonely", "I am not fine", "I miss you", "I am scared"] },
    { depth: 3, question: "What do you secretly wish people noticed?", options: ["How hard I am trying", "How tired I am", "How much I care", "How anxious I get", "How alone I feel"] },
    { depth: 4, question: "What is your biggest internal battle?", options: ["Wanting love but not trusting it", "Wanting success but feeling exhausted", "Wanting peace but creating chaos", "Wanting to be seen but fearing attention", "Wanting change but fearing failure"] },
    { depth: 4, question: "If your emotions were a movie genre lately...", options: ["Horror", "Drama", "Thriller", "Comedy that hides pain", "Quiet indie sadness"] },
  ],
  "academics": [
    { depth: 1, question: "Your study style is best described as...", options: ["Last-minute panic mode", "Organized and scheduled", "Music on, vibes first", "Study with friends or not at all", "Depends on the subject honestly"] },
    { depth: 1, question: "The subject that hits different for you is...", options: ["Math or science", "English or writing", "History or social studies", "Art or music", "None, school is school"] },
    { depth: 1, question: "Your dream school setup would be...", options: ["No homework ever", "Choose your own schedule", "Learn by doing, not sitting", "Smaller classes with real talk", "Online from my bed"] },
    { depth: 2, question: "What kind of student are you in the story of your life?", options: ["The gifted kid who crashed", "The underdog trying to prove everyone wrong", "The perfectionist slowly breaking", "The one who is smart but unmotivated", "The one doing everything alone"] },
    { depth: 2, question: "Your biggest academic fear is...", options: ["Being average", "Being seen as stupid", "Failing and losing your future", "Disappointing your family", "Trying hard and still not being enough"] },
    { depth: 2, question: "When you fall behind, you...", options: ["Panic and pull an all nighter", "Shut down and avoid everything", "Lie and say it is fine", "Get angry at yourself", "Start over on Monday and repeat"] },
    { depth: 3, question: "What do your grades actually represent for you?", options: ["Self worth", "Freedom", "Fear", "Identity", "Survival"] },
    { depth: 3, question: "What does success at school cost you?", options: ["Sleep", "Mental health", "Social life", "Confidence", "Time with family"] },
    { depth: 4, question: "What is your villain in school?", options: ["Procrastination", "Anxiety", "Lack of sleep", "Pressure", "Lack of motivation"] },
    { depth: 4, question: "What is a compliment that secretly irritates you?", options: ["You are so smart", "You always do well", "You are such a hard worker", "You are gifted", "You are doing fine"] },
  ],
  "friendships": [
    { depth: 1, question: "Your friend group role is usually...", options: ["The planner", "The funny one", "The listener", "The wild card", "The one who goes with the flow"] },
    { depth: 1, question: "The best thing about your closest friendship is...", options: ["Inside jokes", "Comfortable silence", "Always having each other's back", "Being completely unfiltered", "Growing together"] },
    { depth: 1, question: "A perfect hangout looks like...", options: ["Late night drives or walks", "Gaming or movie marathon", "Deep talks over food", "Doing something spontaneous", "Just vibing at someone's house"] },
    { depth: 2, question: "Which friendship pain changed you the most?", options: ["Being replaced by someone new", "Getting betrayed by secrets being shared", "Being the only one who cared", "Being used for convenience", "Being slowly ghosted"] },
    { depth: 2, question: "What role do you always end up playing?", options: ["The therapist", "The comedian", "The loyal soldier", "The backup friend", "The one who gets taken for granted"] },
    { depth: 2, question: "When you feel left out, you act...", options: ["Cold", "Fine but sad", "Angry", "Quiet and gone", "Extra funny to hide it"] },
    { depth: 3, question: "What is your friendship toxic trait?", options: ["I test people", "I get distant without explaining", "I forgive too fast", "I over give then resent", "I expect mind reading"] },
    { depth: 3, question: "What do you want more in friendships?", options: ["Loyalty", "Honesty", "Effort", "Consistency", "Depth"] },
    { depth: 4, question: "What kind of friendship do you crave?", options: ["Ride or die", "Soft and safe", "Chaotic and hilarious", "Mature and deep", "Low maintenance but real"] },
    { depth: 4, question: "What is the real reason friendships are hard sometimes?", options: ["People are selfish", "People are insecure", "People do not communicate", "People change", "People do not value what they have"] },
  ],
  "relationships": [
    { depth: 1, question: "Your ideal first date energy is...", options: ["Chill coffee shop vibes", "Something adventurous", "Cooking together", "A long walk and good conversation", "Honestly just hanging out naturally"] },
    { depth: 1, question: "The biggest green flag in someone is...", options: ["They remember little things", "They communicate honestly", "They make you laugh", "They respect your boundaries", "They show up consistently"] },
    { depth: 1, question: "Your love language is probably...", options: ["Words of affirmation", "Quality time", "Physical touch", "Acts of service", "Gift giving"] },
    { depth: 2, question: "What is your biggest fear in love?", options: ["Being cheated on", "Being replaced", "Being too much", "Being used", "Being left when you finally trust"] },
    { depth: 2, question: "When you like someone, you become...", options: ["Bold and flirty", "Quiet and awkward", "Overthinking and obsessive", "Detached and mysterious", "Extra nice and people pleasing"] },
    { depth: 2, question: "Your love language is secretly...", options: ["Attention", "Reassurance", "Effort", "Loyalty", "Understanding"] },
    { depth: 3, question: "What is your relationship weakness?", options: ["I forgive too much", "I do not trust easily", "I need constant reassurance", "I run when things get real", "I overthink every text"] },
    { depth: 3, question: "Which is worse?", options: ["Being alone", "Being with someone and feeling alone", "Loving someone who does not love you back", "Being loved and not believing it", "Losing someone you finally trusted"] },
    { depth: 4, question: "What makes you instantly lose interest?", options: ["Dry replies", "Mixed signals", "Lack of effort", "Disrespect", "Being controlling"] },
    { depth: 4, question: "If someone broke your heart, you would...", options: ["Block them instantly", "Pretend you are fine but spiral", "Try to fix it", "Turn cold and silent", "Become better out of spite"] },
  ],
  "peer support": [
    { depth: 1, question: "When a friend is upset, your first instinct is to...", options: ["Crack a joke to lighten the mood", "Listen without saying much", "Give advice right away", "Hug them or show up physically", "Text them later to check in"] },
    { depth: 1, question: "You feel most helpful when you...", options: ["Make someone smile", "Help someone solve a problem", "Just sit with someone in silence", "Defend someone who can't speak up", "Share your own similar experience"] },
    { depth: 1, question: "The best way to show you care is...", options: ["Being there consistently", "Saying it directly", "Doing something thoughtful", "Giving space when needed", "Fighting for them behind their back"] },
    { depth: 2, question: "If someone says they are fine but you know they are not, you...", options: ["Push until they admit it", "Stay nearby without forcing it", "Give advice immediately", "Act normal so they feel safe", "Get scared and back off"] },
    { depth: 2, question: "What is your biggest fear when supporting someone?", options: ["Saying the wrong thing", "Not being enough", "Getting dragged into drama", "Caring more than they do", "Losing them anyway"] },
    { depth: 2, question: "What kind of pain do you understand most?", options: ["Loneliness", "Family pressure", "Heartbreak", "Feeling like a failure", "Anxiety"] },
    { depth: 3, question: "What do you wish people did when you are struggling?", options: ["Ask real questions", "Check in more than once", "Stop judging", "Give me space but not leave", "Take me seriously"] },
    { depth: 3, question: "What kind of support feels fake to you?", options: ["Empty motivational quotes", "Too much advice", "People making it about them", "People who only show up publicly", "People who disappear after one talk"] },
    { depth: 4, question: "What do you do when your friend is making bad choices?", options: ["Confront them hard", "Try to gently guide them", "Support them anyway", "Pull away to protect yourself", "Tell an adult"] },
    { depth: 4, question: "What is the most powerful thing you can say to someone struggling?", options: ["I am not leaving", "You are not crazy", "I believe you", "You do not have to earn love", "Let us get through today only"] },
  ],
  "fitness & wellness": [
    { depth: 1, question: "Your ideal way to stay active is...", options: ["Team sports", "Solo workouts", "Dancing or movement", "Walking or hiking", "I honestly avoid it"] },
    { depth: 1, question: "What motivates you to move your body?", options: ["Looking good", "Feeling good", "Stress relief", "Social energy", "Habit or routine"] },
    { depth: 1, question: "Your relationship with food is best described as...", options: ["I eat what I want", "I try to be balanced", "It is complicated", "I forget to eat sometimes", "Food is my comfort"] },
    { depth: 2, question: "What is your relationship with your body lately?", options: ["At war", "Trying to make peace", "Numb and disconnected", "Proud but still insecure", "Confused"] },
    { depth: 2, question: "Your health routine breaks when...", options: ["My mental health drops", "I get busy", "I lose motivation", "I feel ugly", "I feel hopeless"] },
    { depth: 2, question: "What kind of comment messes with you the most?", options: ["You look tired", "You gained weight", "You look so skinny", "You look different", "Why do you eat like that"] },
    { depth: 3, question: "What does being healthy mean to you?", options: ["Discipline", "Balance", "Feeling safe in my body", "Looking good", "Having energy to live"] },
    { depth: 3, question: "What is your comfort habit when life is heavy?", options: ["Eating", "Sleeping", "Scrolling", "Avoiding people", "Overworking"] },
    { depth: 4, question: "What is the darkest reason you have tried to change your body?", options: ["To be accepted", "To stop being judged", "To look worthy", "To feel in control", "To stop hating myself"] },
    { depth: 4, question: "What is one thing you want to stop doing to yourself?", options: ["Self criticism", "Comparing", "Over restricting", "Giving up", "Hiding"] },
  ],
  "career": [
    { depth: 1, question: "If money did not matter, you would spend your life...", options: ["Creating things", "Helping people", "Exploring the world", "Building a business", "Learning everything possible"] },
    { depth: 1, question: "Your dream work environment is...", options: ["Work from anywhere", "A team that feels like family", "Solo and independent", "Fast-paced and competitive", "Creative and flexible"] },
    { depth: 1, question: "The trait that will get you furthest in life is...", options: ["Creativity", "Discipline", "People skills", "Resilience", "Intelligence"] },
    { depth: 2, question: "What kind of future are you chasing?", options: ["Power", "Freedom", "Money", "Recognition", "Peace"] },
    { depth: 2, question: "What scares you most about adulthood?", options: ["Becoming ordinary", "Being broke", "Disappointing everyone", "Being stuck in one life", "Not knowing who I am"] },
    { depth: 2, question: "Your biggest pressure source is...", options: ["Family", "Society", "Myself", "Friends", "Social media"] },
    { depth: 3, question: "What is your biggest career insecurity?", options: ["I am not smart enough", "I am not special enough", "I do not have connections", "I do not have discipline", "I do not know what I want"] },
    { depth: 3, question: "What kind of success do you want?", options: ["Loud success everyone sees", "Quiet success where I am happy", "Success that makes my family proud", "Success that gives me control", "Success that gives me time"] },
    { depth: 4, question: "What would you do if nobody could judge you?", options: ["Start a business", "Become an artist", "Travel nonstop", "Study something random", "Choose something totally different"] },
    { depth: 4, question: "What is the most honest reason you want a good career?", options: ["I want respect", "I want safety", "I want to escape my current life", "I want to help others", "I want to prove something"] },
  ],
  "finance": [
    { depth: 1, question: "Your spending style is...", options: ["Impulsive buyer", "Saver by nature", "Only on experiences", "I do not really track it", "Depends on my mood"] },
    { depth: 1, question: "The thing you would splurge on guilt-free is...", options: ["Food", "Clothes or shoes", "Tech or gadgets", "Travel", "Concerts or events"] },
    { depth: 1, question: "If you got $1000 right now, you would...", options: ["Save it all", "Treat yourself first, save the rest", "Invest it somehow", "Spend it with friends", "Help your family"] },
    { depth: 2, question: "What is your biggest money fear?", options: ["Being broke forever", "Being dependent on someone", "Becoming like my parents", "Feeling behind everyone", "Money ruining my life"] },
    { depth: 2, question: "What do you spend money on when you are not okay?", options: ["Food", "Clothes", "Random online stuff", "Games or entertainment", "Going out"] },
    { depth: 2, question: "What money situation is the most embarrassing?", options: ["Owing someone money", "Not being able to go out with friends", "Having to ask parents", "Having less than others", "Not understanding money at all"] },
    { depth: 3, question: "What is your worst spending trigger?", options: ["Boredom", "Stress", "Social pressure", "Feeling insecure", "Celebrating"] },
    { depth: 3, question: "What do you think money really gives people?", options: ["Confidence", "Power", "Options", "Happiness", "Problems"] },
    { depth: 4, question: "If you suddenly had a lot of money, your life would...", options: ["Finally feel safe", "Finally feel free", "Get more complicated", "Make people fake around me", "Make me paranoid"] },
    { depth: 4, question: "What is the most real money lesson you have learned?", options: ["Nobody is coming to save you", "Saving is harder than earning", "People treat you differently", "Money disappears fast", "Money can ruin relationships"] },
  ],
};

function getQuestions(pillar: string) {
  const key = pillar.toLowerCase();
  return questionBank[key] || questionBank["mental health"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { pillar, demo } = await req.json();
    if (!pillar) throw new Error("Pillar is required");

    const supabase = createClient(supabaseUrl, serviceKey);
    const prompts = getQuestions(pillar);

    // ======= DEMO MODE =======
    if (demo) {
      const { data: session, error: sessionError } = await supabase
        .from("peer_connect_sessions")
        .insert({
          user_a: user.id,
          user_b: DEMO_PEER_UUID,
          pillar,
          prompts,
          status: "active",
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      return new Response(
        JSON.stringify({
          status: "matched",
          sessionId: session.id,
          prompts,
          partnerId: DEMO_PEER_UUID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ======= NORMAL MODE =======
    const { data: waiting } = await supabase
      .from("peer_connect_lobby")
      .select("*")
      .eq("pillar", pillar)
      .eq("status", "waiting")
      .neq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!waiting) {
      await supabase
        .from("peer_connect_lobby")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "waiting");

      const { data: lobbyEntry, error: lobbyError } = await supabase
        .from("peer_connect_lobby")
        .insert({ user_id: user.id, pillar, status: "waiting" })
        .select("id")
        .single();

      if (lobbyError) throw lobbyError;

      return new Response(JSON.stringify({ status: "waiting", lobbyId: lobbyEntry.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("peer_connect_sessions")
      .insert({
        user_a: waiting.user_id,
        user_b: user.id,
        pillar,
        prompts,
        status: "active",
      })
      .select("id")
      .single();

    if (sessionError) throw sessionError;

    await supabase
      .from("peer_connect_lobby")
      .update({ status: "matched", matched_with: user.id, session_id: session.id })
      .eq("id", waiting.id);

    await supabase
      .from("peer_connect_lobby")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "waiting");

    await supabase
      .from("peer_connect_lobby")
      .insert({
        user_id: user.id,
        pillar,
        status: "matched",
        matched_with: waiting.user_id,
        session_id: session.id,
      });

    return new Response(
      JSON.stringify({
        status: "matched",
        sessionId: session.id,
        prompts,
        partnerId: waiting.user_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("peer-connect-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
