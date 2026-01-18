import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Save, LogOut, Mail, CheckCircle, AlertCircle, AlertTriangle, User, Circle } from 'lucide-react';
import { PanchayathLocationPicker } from '@/components/settings/PanchayathLocationPicker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Field completion indicator component
const FieldStatus = ({ completed }: { completed: boolean }) => (
  completed ? (
    <CheckCircle className="h-4 w-4 text-green-500" />
  ) : (
    <Circle className="h-4 w-4 text-muted-foreground/50" />
  )
);

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      await refreshProfile();
      toast({ title: 'Avatar updated!' });
    } catch (error: any) {
      toast({ title: 'Error uploading avatar', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          username: username.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: 'Profile updated!' });
    } catch (error: any) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Calculate profile completion
  const profileFields = [
    { key: 'full_name', label: 'Full Name', completed: !!profile?.full_name },
    { key: 'username', label: 'Username', completed: !!profile?.username },
    { key: 'bio', label: 'Bio', completed: !!profile?.bio },
    { key: 'avatar_url', label: 'Profile Photo', completed: !!profile?.avatar_url },
    { key: 'location', label: 'Location', completed: !!profile?.location },
  ];
  
  const completedCount = profileFields.filter(f => f.completed).length;
  const completionPercentage = Math.round((completedCount / profileFields.length) * 100);
  const isProfileIncomplete = completionPercentage < 100;
  const isEmailNotVerified = !user.email || user.email.includes('@phone.local');
  
  const getMissingFields = () => {
    return profileFields.filter(f => !f.completed).map(f => f.label);
  };

  return (
    <MainLayout>
      {/* Sticky Profile Completion Progress Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Profile Completion</span>
            <span className={`text-sm font-bold ${completionPercentage === 100 ? 'text-green-600' : 'text-primary'}`}>
              {completionPercentage}%
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          {completionPercentage < 100 && (
            <p className="text-xs text-muted-foreground mt-1">
              Complete your profile to unlock all features
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>

        {/* Profile Incomplete Reminder */}
        {isProfileIncomplete && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Your profile is not completed</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Complete your profile to help others find and connect with you. Missing: {getMissingFields().join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        {/* Email Verification Reminder */}
        {isEmailNotVerified && (
          <Alert variant="default" className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-400">Your account is not verified</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              Add and verify your email address. Unverified accounts may have limited features and could affect your future development on the platform.
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Settings */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="gradient-primary text-white text-2xl">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">Profile Photo</p>
                  <FieldStatus completed={!!profile?.avatar_url} />
                </div>
                <p className="text-sm text-muted-foreground">JPG, PNG. Max 5MB</p>
              </div>
            </div>

            <Separator />

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <FieldStatus completed={!!profile?.full_name} />
                </div>
                <Input
                  id="fullName"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="username">Username</Label>
                  <FieldStatus completed={!!profile?.username} />
                </div>
                <Input
                  id="username"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <FieldStatus completed={!!profile?.bio} />
                </div>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>

              <Separator className="my-2" />

              {/* Location - Panchayath & Ward */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Location</Label>
                  <FieldStatus completed={!!profile?.location} />
                </div>
                <PanchayathLocationPicker 
                  value={location} 
                  onChange={setLocation} 
                />
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              className="gradient-primary text-white"
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Email Verification for Verified Profile */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Email Verification
              {user.email && !user.email.includes('@phone.local') ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Verified
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Add a verified email to get a verified profile badge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {user.email && !user.email.includes('@phone.local') 
                    ? user.email 
                    : 'No email added'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.email && !user.email.includes('@phone.local')
                    ? 'Your profile is verified'
                    : 'Add your email for profile verification'}
                </p>
              </div>
            </div>

            {(!user.email || user.email.includes('@phone.local')) && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <p className="text-sm text-muted-foreground">
                  A verified email helps build trust with other users and unlocks additional features.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'Email verification feature will be available soon!'
                    });
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Add Email for Verification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Login Credential</p>
                <p className="text-sm text-muted-foreground">
                  {user.email?.includes('@phone.local') 
                    ? user.email.replace('@phone.local', '') + ' (Mobile)'
                    : user.email}
                </p>
              </div>
            </div>

            <Separator />

            <Button variant="destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
