-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('study', 'hobby', 'other')),
  created_by UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_events table
CREATE TABLE public.group_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_rsvps table
CREATE TABLE public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Anyone can view public groups" 
ON public.groups FOR SELECT 
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create groups" 
ON public.groups FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" 
ON public.groups FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Group admins can delete groups" 
ON public.groups FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for group_members
CREATE POLICY "Members can view group members" 
ON public.group_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join groups" 
ON public.group_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and users can leave groups" 
ON public.group_members FOR DELETE 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_members.group_id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for group_messages
CREATE POLICY "Members can view group messages" 
ON public.group_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can send messages" 
ON public.group_messages FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Moderators can update messages" 
ON public.group_messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Users and moderators can delete messages" 
ON public.group_messages FOR DELETE 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- RLS Policies for group_events
CREATE POLICY "Members can view group events" 
ON public.group_events FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_events.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can create events" 
ON public.group_events FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_events.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Event creators and admins can update events" 
ON public.group_events FOR UPDATE 
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_events.group_id AND user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Event creators and admins can delete events" 
ON public.group_events FOR DELETE 
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_events.group_id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for event_rsvps
CREATE POLICY "Members can view event RSVPs" 
ON public.event_rsvps FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_events ge
    JOIN public.group_members gm ON gm.group_id = ge.group_id
    WHERE ge.id = event_rsvps.event_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can RSVP to events" 
ON public.event_rsvps FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their RSVPs" 
ON public.event_rsvps FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their RSVPs" 
ON public.event_rsvps FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_events_updated_at
BEFORE UPDATE ON public.group_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_groups_created_by ON public.groups(created_by);
CREATE INDEX idx_groups_category ON public.groups(category);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON public.group_messages(created_at);
CREATE INDEX idx_group_events_group_id ON public.group_events(group_id);
CREATE INDEX idx_event_rsvps_event_id ON public.event_rsvps(event_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Create storage bucket for group photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('group-photos', 'group-photos', true);

-- Create storage policies
CREATE POLICY "Group members can view photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'group-photos');

CREATE POLICY "Group members can upload photos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'group-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'group-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);