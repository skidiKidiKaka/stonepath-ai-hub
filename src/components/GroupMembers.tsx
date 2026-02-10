import { useState, useEffect } from "react";
import { Users, Shield, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  user_id: string;
  role: string;
  full_name: string;
}

export const GroupMembers = ({ groupId }: { groupId: string }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const fetchMembers = async () => {
    setLoading(true);

    const { data: memberData } = await supabase
      .from("group_members")
      .select("user_id, role")
      .eq("group_id", groupId);

    if (!memberData?.length) {
      setLoading(false);
      return;
    }

    const userIds = (memberData as any[]).map((m) => m.user_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || "Member"));

    const mapped = (memberData as any[]).map((m) => ({
      user_id: m.user_id,
      role: m.role,
      full_name: profileMap.get(m.user_id) || "Member",
    }));

    // Sort: admins first, then moderators, then members
    const roleOrder: Record<string, number> = { admin: 0, moderator: 1, member: 2 };
    mapped.sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3));

    setMembers(mapped);
    setLoading(false);
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge variant="default" className="text-xs gap-1">
          <Crown className="w-3 h-3" /> Admin
        </Badge>
      );
    }
    if (role === "moderator") {
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Shield className="w-3 h-3" /> Mod
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle>Members ({members.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members found.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 p-2 border rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {m.full_name[0]?.toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.full_name}</p>
                </div>
                {getRoleBadge(m.role)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
