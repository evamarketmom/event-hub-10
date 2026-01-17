import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown,
  Send,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Community {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_by: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Discussion {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCommunityData();
    }
  }, [id, user]);

  const fetchCommunityData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch community
      const { data: communityData, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCommunity(communityData);
      setIsCreator(communityData.created_by === user?.id);

      // Fetch members
      const { data: membersData } = await supabase
        .from('community_members')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (id, full_name, username, avatar_url)
        `)
        .eq('community_id', id);

      setMembers(membersData || []);

      // Check if user is a member
      if (user) {
        const isMemberCheck = (membersData || []).some(m => m.user_id === user.id);
        setIsMember(isMemberCheck);
      }

      // Fetch discussions (we'll use comments table for this, or create a simple approach)
      // For now, let's create a simple approach using posts
      const { data: discussionsData } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (id, full_name, username, avatar_url)
        `)
        .eq('post_id', id) // Using post_id as a workaround for community discussions
        .order('created_at', { ascending: false })
        .limit(50);

      // For now, let's just show empty discussions since we don't have a proper table
      setDiscussions([]);
    } catch (error) {
      console.error('Error fetching community:', error);
      toast({ title: 'Error loading community', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }

    try {
      await supabase
        .from('community_members')
        .insert({
          community_id: id,
          user_id: user.id,
          role: 'member',
        });

      toast({ title: 'Joined community!' });
      setIsMember(true);
      fetchCommunityData();
    } catch (error: any) {
      toast({ title: 'Error joining community', description: error.message, variant: 'destructive' });
    }
  };

  const handleLeave = async () => {
    if (!user || !id) return;

    try {
      await supabase
        .from('community_members')
        .delete()
        .eq('community_id', id)
        .eq('user_id', user.id);

      toast({ title: 'Left community' });
      setIsMember(false);
      fetchCommunityData();
    } catch (error: any) {
      toast({ title: 'Error leaving community', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!community) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Community not found</h1>
          <Button onClick={() => navigate('/communities')}>Browse Communities</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Community Header */}
        <Card className="overflow-hidden border-0 shadow-soft">
          <div 
            className="h-40 gradient-secondary bg-cover bg-center"
            style={community.cover_image_url ? { backgroundImage: `url(${community.cover_image_url})` } : {}}
          />
          
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                <AvatarFallback className="text-2xl gradient-primary text-white">
                  {community.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 sm:pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{community.name}</h1>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {members.length} members
                    </span>
                  </div>
                  
                  {!isCreator && (
                    <Button
                      variant={isMember ? "outline" : "default"}
                      className={!isMember ? "gradient-primary text-white" : ""}
                      onClick={isMember ? handleLeave : handleJoin}
                    >
                      {isMember ? (
                        <>
                          <UserMinus className="mr-2 h-4 w-4" />
                          Leave
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Join
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {community.description && (
              <p className="mt-4 text-foreground">{community.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-1" />
              Members
            </TabsTrigger>
            <TabsTrigger value="discussions">
              <MessageSquare className="h-4 w-4 mr-1" />
              Discussions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {members.map((member) => (
                <Card 
                  key={member.id}
                  className="border-0 shadow-soft cursor-pointer card-hover"
                  onClick={() => navigate(`/user/${member.user_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.profiles?.avatar_url || ''} />
                        <AvatarFallback className="gradient-primary text-white">
                          {member.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">
                            {member.profiles?.full_name || 'Anonymous'}
                          </p>
                          {member.role === 'admin' && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          @{member.profiles?.username || 'user'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="discussions" className="mt-4">
            <Card className="border-0 shadow-soft">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Discussions coming soon
                </h3>
                <p className="text-muted-foreground">
                  Community discussions feature is under development
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
