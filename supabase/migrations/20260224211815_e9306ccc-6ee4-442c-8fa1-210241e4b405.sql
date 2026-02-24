
-- Allow participants to DELETE their peer connect sessions
CREATE POLICY "Participants can delete"
ON public.peer_connect_sessions
FOR DELETE
USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Allow participants to DELETE messages from their sessions
CREATE POLICY "Participants can delete messages"
ON public.peer_connect_messages
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM peer_connect_sessions
  WHERE peer_connect_sessions.id = peer_connect_messages.session_id
  AND (auth.uid() = peer_connect_sessions.user_a OR auth.uid() = peer_connect_sessions.user_b)
));

-- Allow participants to DELETE responses from their sessions
CREATE POLICY "Participants can delete responses"
ON public.peer_connect_responses
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM peer_connect_sessions
  WHERE peer_connect_sessions.id = peer_connect_responses.session_id
  AND (auth.uid() = peer_connect_sessions.user_a OR auth.uid() = peer_connect_sessions.user_b)
));

-- Allow authenticated users to view profiles (needed for chat history partner names & friends list)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);
