-- Manually delete the specific group "werrw" and related data
begin;

-- Replace with the known group id for "werrw"
-- From logs: ca9ad213-22c2-487b-9ad3-23d47c606ecb

-- Clean dependent data first
DELETE FROM event_rsvps 
WHERE event_id IN (
  SELECT id FROM group_events WHERE group_id = 'ca9ad213-22c2-487b-9ad3-23d47c606ecb'
);

DELETE FROM group_messages 
WHERE group_id = 'ca9ad213-22c2-487b-9ad3-23d47c606ecb';

DELETE FROM group_members 
WHERE group_id = 'ca9ad213-22c2-487b-9ad3-23d47c606ecb';

DELETE FROM group_events 
WHERE group_id = 'ca9ad213-22c2-487b-9ad3-23d47c606ecb';

-- Finally delete the group
DELETE FROM groups 
WHERE id = 'ca9ad213-22c2-487b-9ad3-23d47c606ecb';

commit;