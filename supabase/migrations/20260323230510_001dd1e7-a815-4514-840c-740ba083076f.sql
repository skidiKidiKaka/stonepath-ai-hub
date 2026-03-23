
-- 1. Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'student';

-- 2. Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Create parent_student_links table
CREATE TABLE public.parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  link_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- 4. Create is_linked_parent function (table now exists)
CREATE OR REPLACE FUNCTION public.is_linked_parent(_parent_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = _parent_id AND student_id = _student_id AND status = 'active'
  )
$$;

-- 5. RLS on parent_student_links
CREATE POLICY "Parents can view their links" ON public.parent_student_links
  FOR SELECT TO authenticated USING (auth.uid() = parent_id);
CREATE POLICY "Students can view their links" ON public.parent_student_links
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Parents can create links" ON public.parent_student_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_id AND public.has_role(auth.uid(), 'parent'));
CREATE POLICY "Students can update link status" ON public.parent_student_links
  FOR UPDATE TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Students can delete links" ON public.parent_student_links
  FOR DELETE TO authenticated USING (auth.uid() = student_id);

-- 6. Create announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_roles text[] DEFAULT '{student,parent}',
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can insert announcements" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update announcements" ON public.announcements
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete announcements" ON public.announcements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);

-- 7. Create panel_messages table
CREATE TABLE public.panel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  context text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.panel_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.panel_messages
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.panel_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients can update messages" ON public.panel_messages
  FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- 8. Admin RLS on existing tables
CREATE POLICY "Admins can view bullying reports" ON public.bullying_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bullying reports" ON public.bullying_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all counselor requests" ON public.counselor_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update counselor requests" ON public.counselor_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all mentor requests" ON public.mentor_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update mentor requests" ON public.mentor_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Parent can view linked student data
CREATE POLICY "Parents can view linked student moods" ON public.mood_entries
  FOR SELECT TO authenticated USING (public.is_linked_parent(auth.uid(), user_id));
CREATE POLICY "Parents can view linked student assignments" ON public.assignments
  FOR SELECT TO authenticated USING (public.is_linked_parent(auth.uid(), user_id));

-- 10. Update handle_new_user to save role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$;

-- 11. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
