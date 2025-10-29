-- Create table for workout logs
CREATE TABLE public.workout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  intensity TEXT NOT NULL,
  notes TEXT,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user fitness streaks
CREATE TABLE public.fitness_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_workout_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_streaks ENABLE ROW LEVEL SECURITY;

-- Workout logs policies
CREATE POLICY "Users can view their own workout logs"
ON public.workout_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout logs"
ON public.workout_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs"
ON public.workout_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs"
ON public.workout_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Fitness streaks policies
CREATE POLICY "Users can view their own streak"
ON public.fitness_streaks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
ON public.fitness_streaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
ON public.fitness_streaks
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update streak when workout is logged
CREATE OR REPLACE FUNCTION update_fitness_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Get or create streak record
  SELECT last_workout_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM fitness_streaks
  WHERE user_id = NEW.user_id;

  -- If no streak record exists, create one
  IF NOT FOUND THEN
    INSERT INTO fitness_streaks (user_id, current_streak, longest_streak, last_workout_date)
    VALUES (NEW.user_id, 1, 1, NEW.workout_date);
    RETURN NEW;
  END IF;

  -- Update streak logic
  IF v_last_date IS NULL THEN
    -- First workout
    UPDATE fitness_streaks
    SET current_streak = 1,
        longest_streak = GREATEST(1, v_longest_streak),
        last_workout_date = NEW.workout_date,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.workout_date = v_last_date THEN
    -- Same day, no streak change
    RETURN NEW;
  ELSIF NEW.workout_date = v_last_date + 1 THEN
    -- Consecutive day
    UPDATE fitness_streaks
    SET current_streak = v_current_streak + 1,
        longest_streak = GREATEST(v_current_streak + 1, v_longest_streak),
        last_workout_date = NEW.workout_date,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.workout_date > v_last_date + 1 THEN
    -- Streak broken
    UPDATE fitness_streaks
    SET current_streak = 1,
        last_workout_date = NEW.workout_date,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for streak updates
CREATE TRIGGER update_streak_on_workout
AFTER INSERT ON workout_logs
FOR EACH ROW
EXECUTE FUNCTION update_fitness_streak();