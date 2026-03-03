import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useTheme } from "next-themes";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  birthdate: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  school: string | null;
  grade: string | null;
  bio: string | null;
  phone: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { theme, setTheme } = useTheme();

  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      setFullName(session.user.user_metadata?.full_name || "");
      fetchProfile(session.user.id);
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name, gender, birthdate, height_cm, weight_kg, school, grade, bio, phone")
      .eq("user_id", userId)
      .single();
    if (data) {
      if (data.avatar_url) {
        setAvatarPath(data.avatar_url);
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
        setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
      }
      setGender((data as any).gender || "");
      setBirthdate((data as any).birthdate || "");
      setHeightCm((data as any).height_cm?.toString() || "");
      setWeightKg((data as any).weight_kg?.toString() || "");
      setSchool((data as any).school || "");
      setGrade((data as any).grade || "");
      setBio((data as any).bio || "");
      setPhone((data as any).phone || "");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploadingAvatar(true);
    const path = `${user.id}/avatar`;

    if (avatarPath) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploadingAvatar(false); return; }

    await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", user.id);
    
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    setAvatarPath(path);
    setUploadingAvatar(false);
    toast.success("Avatar updated!");
  };

  const handleSaveName = async () => {
    if (!user || !fullName.trim()) return;
    setSavingName(true);
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    if (authError) { toast.error("Failed to update name"); setSavingName(false); return; }
    await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("user_id", user.id);
    setSavingName(false);
    toast.success("Name updated!");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const updates: Record<string, any> = {
      gender: gender || null,
      birthdate: birthdate || null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      school: school || null,
      grade: grade || null,
      bio: bio || null,
      phone: phone || null,
    };
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (error) { toast.error("Failed to save profile"); setSavingProfile(false); return; }
    setSavingProfile(false);
    toast.success("Profile updated!");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); setSavingPassword(false); return; }
    setNewPassword("");
    setConfirmPassword("");
    setSavingPassword(false);
    toast.success("Password updated!");
  };

  const getInitials = () => {
    if (fullName) return fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return (user?.email?.[0] || "U").toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/5 to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Profile Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Avatar Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upload a photo (max 2MB)</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, or GIF</p>
            </div>
          </div>
        </Card>

        {/* Personal Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="flex gap-2">
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                <Button onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email || ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
            </div>
          </div>
        </Card>

        {/* Extended Profile */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">About You</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself..." rows={3} maxLength={500} />
              <p className="text-xs text-muted-foreground">{bio.length}/500</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthdate">Birthdate</Label>
                <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heightCm">Height (cm)</Label>
                <Input id="heightCm" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="170" min={50} max={300} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input id="weightKg" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="65" min={10} max={500} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Your school name" maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade / Year</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6th">6th Grade</SelectItem>
                    <SelectItem value="7th">7th Grade</SelectItem>
                    <SelectItem value="8th">8th Grade</SelectItem>
                    <SelectItem value="9th">9th Grade (Freshman)</SelectItem>
                    <SelectItem value="10th">10th Grade (Sophomore)</SelectItem>
                    <SelectItem value="11th">11th Grade (Junior)</SelectItem>
                    <SelectItem value="12th">12th Grade (Senior)</SelectItem>
                    <SelectItem value="college-1">College - 1st Year</SelectItem>
                    <SelectItem value="college-2">College - 2nd Year</SelectItem>
                    <SelectItem value="college-3">College - 3rd Year</SelectItem>
                    <SelectItem value="college-4">College - 4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" maxLength={20} />
            </div>

            <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Profile
            </Button>
          </div>
        </Card>

        {/* Password */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
            </Button>
          </div>
        </Card>

        {/* Theme */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="flex gap-3">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setTheme(value)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
