export interface PeerQuestion {
  question: string;
  options: string[];
  depth: 1 | 2 | 3 | 4;
}

export interface PillarQuestions {
  pillar: string;
  label: string;
  questions: PeerQuestion[];
}

export const DEPTH_LABELS: Record<number, string> = {
  1: "Surface",
  2: "Real",
  3: "Deep",
  4: "Unhinged",
};

export const CONNECTION_LABELS = [
  { min: 0, label: "Strangers" },
  { min: 15, label: "Acquaintances" },
  { min: 35, label: "Getting Real" },
  { min: 60, label: "Bonded" },
  { min: 85, label: "Soulbound" },
];

export function getConnectionLabel(score: number): string {
  for (let i = CONNECTION_LABELS.length - 1; i >= 0; i--) {
    if (score >= CONNECTION_LABELS[i].min) return CONNECTION_LABELS[i].label;
  }
  return "Strangers";
}

export function calculateConnectionPoints(
  myAnswer: number,
  partnerAnswer: number,
  depth: number
): number {
  const multiplier = depth === 1 ? 1 : depth === 2 ? 1.5 : depth === 3 ? 2 : 3;
  let base = 0;
  if (myAnswer === partnerAnswer) {
    base = 3;
  } else if (Math.abs(myAnswer - partnerAnswer) === 1) {
    base = 1;
  }
  return Math.round(base * multiplier);
}

const mentalHealthQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "When you are stressed, you usually...", options: ["Listen to music", "Talk to someone", "Go for a walk", "Write it down", "Scroll endlessly"] },
  { depth: 1, question: "Your go-to comfort activity after a bad day is...", options: ["Binge-watching something", "Eating comfort food", "Calling a friend", "Sleeping it off", "Working out the frustration"] },
  { depth: 1, question: "If your mood had a weather forecast today, it would be...", options: ["Sunny and clear", "Partly cloudy", "Thunderstorms incoming", "Foggy and confused", "A calm sunset"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "Which thought shows up in your head at 2 AM the most?", options: ["Everyone secretly dislikes me", "I am wasting my life", "I am going to mess everything up", "I feel behind and it is embarrassing", "I do not even know who I am anymore"] },
  { depth: 2, question: "When you are not okay, you usually...", options: ["Disappear and act fine later", "Get mean for no reason", "Get quiet and overthink everything", "Cry alone and hate admitting it", "Stay busy so I do not feel it"] },
  { depth: 2, question: "What hurts you the fastest?", options: ["Being ignored", "Being misunderstood", "Being replaced", "Being talked about", "Being treated like I am too much"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What is the hardest sentence for you to say out loud?", options: ["I need help", "I am lonely", "I am not fine", "I miss you", "I am scared"] },
  { depth: 3, question: "What do you secretly wish people noticed?", options: ["How hard I am trying", "How tired I am", "How much I care", "How anxious I get", "How alone I feel"] },
  { depth: 3, question: "When someone tries to understand you, you feel...", options: ["Relief", "Suspicious", "Exposed", "Like crying instantly", "Like running away"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "What is your biggest internal battle?", options: ["Wanting love but not trusting it", "Wanting success but feeling exhausted", "Wanting peace but creating chaos", "Wanting to be seen but fearing attention", "Wanting change but fearing failure"] },
  { depth: 4, question: "If your emotions were a movie genre lately...", options: ["Horror", "Drama", "Thriller", "Comedy that hides pain", "Quiet indie sadness"] },
  { depth: 4, question: "What is your worst mental habit?", options: ["I assume the worst", "I replay conversations for hours", "I need control or I panic", "I compare myself until I hate myself", "I sabotage good things"] },
  { depth: 4, question: "If your stress had a physical form, it would look like...", options: ["A knot in my chest", "A storm in my head", "A weight on my back", "A buzzing in my skin", "A loud alarm that never stops"] },
  { depth: 4, question: "The version of you that nobody sees is...", options: ["The one who is terrified", "The one who is exhausted from pretending", "The one who wants to disappear", "The one who cares way too much", "The one who does not recognize themselves"] },
  { depth: 4, question: "If you could send a message to your past self, it would be...", options: ["It is not your fault", "You deserved better", "Stop performing for people", "The pain does not last forever", "You are stronger than you think"] },
];

const academicsQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "Your study style is best described as...", options: ["Last-minute panic mode", "Organized and scheduled", "Music on, vibes first", "Study with friends or not at all", "Depends on the subject honestly"] },
  { depth: 1, question: "The subject that hits different for you is...", options: ["Math or science", "English or writing", "History or social studies", "Art or music", "None, school is school"] },
  { depth: 1, question: "Your dream school setup would be...", options: ["No homework ever", "Choose your own schedule", "Learn by doing, not sitting", "Smaller classes with real talk", "Online from my bed"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "What kind of student are you in the story of your life?", options: ["The gifted kid who crashed", "The underdog trying to prove everyone wrong", "The perfectionist slowly breaking", "The one who is smart but unmotivated", "The one doing everything alone"] },
  { depth: 2, question: "Your biggest academic fear is...", options: ["Being average", "Being seen as stupid", "Failing and losing your future", "Disappointing your family", "Trying hard and still not being enough"] },
  { depth: 2, question: "When you fall behind, you...", options: ["Panic and pull an all nighter", "Shut down and avoid everything", "Lie and say it is fine", "Get angry at yourself", "Start over on Monday and repeat"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What do your grades actually represent for you?", options: ["Self worth", "Freedom", "Fear", "Identity", "Survival"] },
  { depth: 3, question: "What does success at school cost you?", options: ["Sleep", "Mental health", "Social life", "Confidence", "Time with family"] },
  { depth: 3, question: "Which moment hits the hardest?", options: ["Seeing your grade drop after trying", "Watching others succeed easily", "Being told you have potential", "Forgetting something on test day", "Feeling like you do not belong"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "What is your villain in school?", options: ["Procrastination", "Anxiety", "Lack of sleep", "Pressure", "Lack of motivation"] },
  { depth: 4, question: "What is a compliment that secretly irritates you?", options: ["You are so smart", "You always do well", "You are such a hard worker", "You are gifted", "You are doing fine"] },
  { depth: 4, question: "You would rather...", options: ["Be smart and miserable", "Be average and peaceful", "Be failing but happy", "Be successful but lonely", "Be unknown but free"] },
  { depth: 4, question: "If you could delete one part of school, it would be...", options: ["Homework", "Timed tests", "Competitive ranking", "Attendance rules", "Group projects"] },
  { depth: 4, question: "The thing nobody tells you about being a good student is...", options: ["It is lonely at the top", "You burn out and nobody cares", "You lose yourself trying to perform", "People expect more and more", "You start doing it for everyone else"] },
  { depth: 4, question: "If school did not exist, who would you actually be?", options: ["Happier but lost", "More creative", "Finally free", "Exactly the same", "Someone I have never met yet"] },
];

const friendshipsQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "Your friend group role is usually...", options: ["The planner", "The funny one", "The listener", "The wild card", "The one who goes with the flow"] },
  { depth: 1, question: "The best thing about your closest friendship is...", options: ["Inside jokes", "Comfortable silence", "Always having each other's back", "Being completely unfiltered", "Growing together"] },
  { depth: 1, question: "A perfect hangout looks like...", options: ["Late night drives or walks", "Gaming or movie marathon", "Deep talks over food", "Doing something spontaneous", "Just vibing at someone's house"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "Which friendship pain changed you the most?", options: ["Being replaced by someone new", "Getting betrayed by secrets being shared", "Being the only one who cared", "Being used for convenience", "Being slowly ghosted"] },
  { depth: 2, question: "What role do you always end up playing?", options: ["The therapist", "The comedian", "The loyal soldier", "The backup friend", "The one who gets taken for granted"] },
  { depth: 2, question: "When you feel left out, you act...", options: ["Cold", "Fine but sad", "Angry", "Quiet and gone", "Extra funny to hide it"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What is your friendship toxic trait?", options: ["I test people", "I get distant without explaining", "I forgive too fast", "I over give then resent", "I expect mind reading"] },
  { depth: 3, question: "What do you want more in friendships?", options: ["Loyalty", "Honesty", "Effort", "Consistency", "Depth"] },
  { depth: 3, question: "If your friend suddenly stopped texting, your first thought is...", options: ["I did something wrong", "They found someone better", "They are busy but it still hurts", "I should stop caring first", "I will pretend I do not notice"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "What kind of friendship do you crave?", options: ["Ride or die", "Soft and safe", "Chaotic and hilarious", "Mature and deep", "Low maintenance but real"] },
  { depth: 4, question: "What is the real reason friendships are hard sometimes?", options: ["People are selfish", "People are insecure", "People do not communicate", "People change", "People do not value what they have"] },
  { depth: 4, question: "What would hurt more?", options: ["A friend forgetting your birthday", "A friend making fun of something you are sensitive about", "A friend choosing others over you in front of you", "A friend not defending you", "A friend acting different around popular people"] },
  { depth: 4, question: "What kind of friend scares you?", options: ["The jealous one", "The fake nice one", "The clingy one", "The one who disappears then returns", "The one who competes with you"] },
  { depth: 4, question: "The friendship breakup that would destroy you is...", options: ["Your best friend choosing someone new", "Finding out they talked behind your back", "Realizing you were always the backup", "Growing apart with no closure", "Being cut off without explanation"] },
  { depth: 4, question: "What you will never say to your best friend but wish you could...", options: ["You hurt me and you do not even know", "I am scared of losing you", "I feel like I care more", "Sometimes I am jealous of you", "I do not know who I am without you"] },
];

const relationshipsQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "Your ideal first date energy is...", options: ["Chill coffee shop vibes", "Something adventurous", "Cooking together", "A long walk and good conversation", "Honestly just hanging out naturally"] },
  { depth: 1, question: "The biggest green flag in someone is...", options: ["They remember little things", "They communicate honestly", "They make you laugh", "They respect your boundaries", "They show up consistently"] },
  { depth: 1, question: "Your love language is probably...", options: ["Words of affirmation", "Quality time", "Physical touch", "Acts of service", "Gift giving"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "What is your biggest fear in love?", options: ["Being cheated on", "Being replaced", "Being too much", "Being used", "Being left when you finally trust"] },
  { depth: 2, question: "When you like someone, you become...", options: ["Bold and flirty", "Quiet and awkward", "Overthinking and obsessive", "Detached and mysterious", "Extra nice and people pleasing"] },
  { depth: 2, question: "Your love language is secretly...", options: ["Attention", "Reassurance", "Effort", "Loyalty", "Understanding"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What is your relationship weakness?", options: ["I forgive too much", "I do not trust easily", "I need constant reassurance", "I run when things get real", "I overthink every text"] },
  { depth: 3, question: "Which is worse?", options: ["Being alone", "Being with someone and feeling alone", "Loving someone who does not love you back", "Being loved and not believing it", "Losing someone you finally trusted"] },
  { depth: 3, question: "What ruins relationships fastest?", options: ["Ego", "Insecurity", "Boredom", "Lack of communication", "Control"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "What makes you instantly lose interest?", options: ["Dry replies", "Mixed signals", "Lack of effort", "Disrespect", "Being controlling"] },
  { depth: 4, question: "If someone broke your heart, you would...", options: ["Block them instantly", "Pretend you are fine but spiral", "Try to fix it", "Turn cold and silent", "Become better out of spite"] },
  { depth: 4, question: "Which would hurt you most?", options: ["They lie", "They forget you in public", "They stop trying", "They flirt with others", "They do not defend you"] },
  { depth: 4, question: "What kind of person attracts you?", options: ["Confident and protective", "Calm and emotionally safe", "Funny and chaotic", "Ambitious and driven", "Mysterious and intense"] },
  { depth: 4, question: "The most toxic thing you have accepted in a relationship is...", options: ["Being someone's second choice", "Waiting for someone who never shows up", "Forgiving what should not be forgiven", "Losing yourself to keep them", "Pretending you did not care when you did"] },
  { depth: 4, question: "What nobody tells you about love at this age is...", options: ["It can actually break you", "You will confuse attention for love", "You are not ready but you will try anyway", "It teaches you who you really are", "Sometimes the right person comes at the wrong time"] },
];

const peerSupportQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "When a friend is upset, your first instinct is to...", options: ["Crack a joke to lighten the mood", "Listen without saying much", "Give advice right away", "Hug them or show up physically", "Text them later to check in"] },
  { depth: 1, question: "You feel most helpful when you...", options: ["Make someone smile", "Help someone solve a problem", "Just sit with someone in silence", "Defend someone who can't speak up", "Share your own similar experience"] },
  { depth: 1, question: "The best way to show you care is...", options: ["Being there consistently", "Saying it directly", "Doing something thoughtful", "Giving space when needed", "Fighting for them behind their back"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "If someone says they are fine but you know they are not, you...", options: ["Push until they admit it", "Stay nearby without forcing it", "Give advice immediately", "Act normal so they feel safe", "Get scared and back off"] },
  { depth: 2, question: "What is your biggest fear when supporting someone?", options: ["Saying the wrong thing", "Not being enough", "Getting dragged into drama", "Caring more than they do", "Losing them anyway"] },
  { depth: 2, question: "What kind of pain do you understand most?", options: ["Loneliness", "Family pressure", "Heartbreak", "Feeling like a failure", "Anxiety"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What do you wish people did when you are struggling?", options: ["Ask real questions", "Check in more than once", "Stop judging", "Give me space but not leave", "Take me seriously"] },
  { depth: 3, question: "What kind of support feels fake to you?", options: ["Empty motivational quotes", "Too much advice", "People making it about them", "People who only show up publicly", "People who disappear after one talk"] },
  { depth: 3, question: "How do you react when someone cries in front of you?", options: ["I freeze", "I comfort instantly", "I crack a joke because panic", "I listen quietly", "I get emotional too"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "What do you do when your friend is making bad choices?", options: ["Confront them hard", "Try to gently guide them", "Support them anyway", "Pull away to protect yourself", "Tell an adult"] },
  { depth: 4, question: "What is the most powerful thing you can say to someone struggling?", options: ["I am not leaving", "You are not crazy", "I believe you", "You do not have to earn love", "Let us get through today only"] },
  { depth: 4, question: "Would you rather be...", options: ["The person everyone comes to", "The person nobody expects anything from", "The person who is admired", "The person who is understood", "The person who disappears"] },
  { depth: 4, question: "Which is harder?", options: ["Helping someone who refuses help", "Helping someone who is self destructive", "Helping someone who is depressed", "Helping someone who is angry", "Helping someone who is ashamed"] },
  { depth: 4, question: "The hardest part about being the strong friend is...", options: ["Nobody asks if you are okay", "You absorb everyone's pain", "You do not know how to ask for help", "People assume you are always fine", "You feel guilty falling apart"] },
  { depth: 4, question: "If you could take someone's pain for a day, you would feel...", options: ["Honored they trusted me", "Terrified of what I might feel", "Like I finally understand them", "Overwhelmed but willing", "Like I already do this anyway"] },
];

const fitnessQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "Your ideal way to stay active is...", options: ["Team sports", "Solo workouts", "Dancing or movement", "Walking or hiking", "I honestly avoid it"] },
  { depth: 1, question: "What motivates you to move your body?", options: ["Looking good", "Feeling good", "Stress relief", "Social energy", "Habit or routine"] },
  { depth: 1, question: "Your relationship with food is best described as...", options: ["I eat what I want", "I try to be balanced", "It is complicated", "I forget to eat sometimes", "Food is my comfort"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "What is your relationship with your body lately?", options: ["At war", "Trying to make peace", "Numb and disconnected", "Proud but still insecure", "Confused"] },
  { depth: 2, question: "Your health routine breaks when...", options: ["My mental health drops", "I get busy", "I lose motivation", "I feel ugly", "I feel hopeless"] },
  { depth: 2, question: "What kind of comment messes with you the most?", options: ["You look tired", "You gained weight", "You look so skinny", "You look different", "Why do you eat like that"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What does being healthy mean to you?", options: ["Discipline", "Balance", "Feeling safe in my body", "Looking good", "Having energy to live"] },
  { depth: 3, question: "What is your comfort habit when life is heavy?", options: ["Eating", "Sleeping", "Scrolling", "Avoiding people", "Overworking"] },
  { depth: 3, question: "When you look in the mirror, you usually...", options: ["Critique everything", "Avoid eye contact", "Feel okay sometimes", "Feel confident rarely", "Depends on the day"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "What is the darkest reason you have tried to change your body?", options: ["To be accepted", "To stop being judged", "To look worthy", "To feel in control", "To stop hating myself"] },
  { depth: 4, question: "What is one thing you want to stop doing to yourself?", options: ["Self criticism", "Comparing", "Over restricting", "Giving up", "Hiding"] },
  { depth: 4, question: "What pushes you harder?", options: ["Feeling insecure", "A breakup or rejection", "A goal or challenge", "Wanting to prove something", "Wanting to feel better"] },
  { depth: 4, question: "What would you rather have?", options: ["A strong body", "A calm mind", "Both but I feel stuck", "Neither, I just want peace", "Something else entirely"] },
  { depth: 4, question: "The thing nobody says about body image in high school is...", options: ["Everyone is pretending they do not care", "Social media made it impossible to feel normal", "Boys struggle with it just as much", "It changes how you walk into a room", "It controls more of your life than you admit"] },
  { depth: 4, question: "If your body could talk, it would probably say...", options: ["Please stop punishing me", "I am doing my best", "Why is nothing ever enough", "Thank you for trying lately", "I wish you saw what others see"] },
];

const careerQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "If money did not matter, you would spend your life...", options: ["Creating things", "Helping people", "Exploring the world", "Building a business", "Learning everything possible"] },
  { depth: 1, question: "Your dream work environment is...", options: ["Work from anywhere", "A team that feels like family", "Solo and independent", "Fast-paced and competitive", "Creative and flexible"] },
  { depth: 1, question: "The trait that will get you furthest in life is...", options: ["Creativity", "Discipline", "People skills", "Resilience", "Intelligence"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "What kind of future are you chasing?", options: ["Power", "Freedom", "Money", "Recognition", "Peace"] },
  { depth: 2, question: "What scares you most about adulthood?", options: ["Becoming ordinary", "Being broke", "Disappointing everyone", "Being stuck in one life", "Not knowing who I am"] },
  { depth: 2, question: "Your biggest pressure source is...", options: ["Family", "Society", "Myself", "Friends", "Social media"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What is your biggest career insecurity?", options: ["I am not smart enough", "I am not special enough", "I do not have connections", "I do not have discipline", "I do not know what I want"] },
  { depth: 3, question: "What kind of success do you want?", options: ["Loud success everyone sees", "Quiet success where I am happy", "Success that makes my family proud", "Success that gives me control", "Success that gives me time"] },
  { depth: 3, question: "What do you secretly want people to say about you?", options: ["They are unstoppable", "They are talented", "They are brave", "They are different", "They made it"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "What would you do if nobody could judge you?", options: ["Start a business", "Become an artist", "Travel nonstop", "Study something random", "Choose something totally different"] },
  { depth: 4, question: "What is the most honest reason you want a good career?", options: ["I want respect", "I want safety", "I want to escape my current life", "I want to help others", "I want to prove something"] },
  { depth: 4, question: "What would hurt more?", options: ["Failing publicly", "Never trying", "Trying and still failing", "Watching others pass you", "Being successful and still empty"] },
  { depth: 4, question: "You would rather...", options: ["Be rich and stressed", "Be broke and happy", "Be successful and lonely", "Be average and peaceful", "Be famous and judged"] },
  { depth: 4, question: "The real reason you grind so hard is...", options: ["I am terrified of being ordinary", "I do not want my parents' life", "I need to prove I am worth something", "I have no backup plan", "I do not know what else to do with myself"] },
  { depth: 4, question: "If your future self could see you now, they would say...", options: ["You worried about the wrong things", "You were harder on yourself than you needed to be", "The path you chose was right even when it hurt", "You should have taken more risks", "Everything you are feeling right now passes"] },
];

const financeQuestions: PeerQuestion[] = [
  // Depth 1 — Surface (Q1-3)
  { depth: 1, question: "Your spending style is...", options: ["Impulsive buyer", "Saver by nature", "Only on experiences", "I do not really track it", "Depends on my mood"] },
  { depth: 1, question: "The thing you would splurge on guilt-free is...", options: ["Food", "Clothes or shoes", "Tech or gadgets", "Travel", "Concerts or events"] },
  { depth: 1, question: "If you got $1000 right now, you would...", options: ["Save it all", "Treat yourself first, save the rest", "Invest it somehow", "Spend it with friends", "Help your family"] },
  // Depth 2 — Real (Q4-6)
  { depth: 2, question: "What is your biggest money fear?", options: ["Being broke forever", "Being dependent on someone", "Becoming like my parents", "Feeling behind everyone", "Money ruining my life"] },
  { depth: 2, question: "What do you spend money on when you are not okay?", options: ["Food", "Clothes", "Random online stuff", "Games or entertainment", "Going out"] },
  { depth: 2, question: "What money situation is the most embarrassing?", options: ["Owing someone money", "Not being able to go out with friends", "Having to ask parents", "Having less than others", "Not understanding money at all"] },
  // Depth 3 — Deep (Q7-9)
  { depth: 3, question: "What is your worst spending trigger?", options: ["Boredom", "Stress", "Social pressure", "Feeling insecure", "Celebrating"] },
  { depth: 3, question: "What do you think money really gives people?", options: ["Confidence", "Power", "Options", "Happiness", "Problems"] },
  { depth: 3, question: "What would you rather be known for?", options: ["Being rich", "Being generous", "Being smart with money", "Being self made", "Being carefree"] },
  // Depth 4 — Unhinged (Q10-15)
  { depth: 4, question: "If you suddenly had a lot of money, your life would...", options: ["Finally feel safe", "Finally feel free", "Get more complicated", "Make people fake around me", "Make me paranoid"] },
  { depth: 4, question: "What is the most real money lesson you have learned?", options: ["Nobody is coming to save you", "Saving is harder than earning", "People treat you differently", "Money disappears fast", "Money can ruin relationships"] },
  { depth: 4, question: "What is your biggest financial goal right now?", options: ["Save money secretly", "Move out someday", "Buy something big", "Stop feeling anxious about money", "Help my family"] },
  { depth: 4, question: "If you had to choose one, you would pick...", options: ["Money and no friends", "Friends and no money", "Money and stress", "Peace and less money", "Depends on how broke"] },
  { depth: 4, question: "The thing about money nobody talks about in high school is...", options: ["Some kids have it way harder than they show", "It already shapes your friendships", "It affects your mental health more than grades", "You feel guilty having it and guilty not having it", "It is the first real inequality you notice"] },
  { depth: 4, question: "If money decided your worth, you would feel...", options: ["Worthless", "Average", "Motivated to grind harder", "Angry at the system", "Like it already does and it hurts"] },
];

export const PEER_CONNECT_QUESTIONS: PillarQuestions[] = [
  { pillar: "Mental Health", label: "Mental Health", questions: mentalHealthQuestions },
  { pillar: "Academics", label: "Academics", questions: academicsQuestions },
  { pillar: "Friendships", label: "Friendships", questions: friendshipsQuestions },
  { pillar: "Relationships", label: "Relationships", questions: relationshipsQuestions },
  { pillar: "Peer Support", label: "Peer Support", questions: peerSupportQuestions },
  { pillar: "Fitness & Wellness", label: "Fitness & Wellness", questions: fitnessQuestions },
  { pillar: "Career", label: "Career", questions: careerQuestions },
  { pillar: "Finance", label: "Finance", questions: financeQuestions },
];

export function getQuestionsForPillar(pillar: string): PeerQuestion[] {
  const found = PEER_CONNECT_QUESTIONS.find(
    (p) => p.pillar.toLowerCase() === pillar.toLowerCase() ||
           p.label.toLowerCase() === pillar.toLowerCase()
  );
  return found?.questions || mentalHealthQuestions;
}
