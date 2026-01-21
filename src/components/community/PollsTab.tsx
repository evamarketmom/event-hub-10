import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PollCard } from './PollCard';
import { CreatePollDialog } from './CreatePollDialog';
import { BarChart3 } from 'lucide-react';

interface Poll {
  id: string;
  question: string;
  created_at: string;
  ends_at: string | null;
  is_closed: boolean;
  created_by: string;
  options: { id: string; option_text: string; vote_count: number }[];
  total_votes: number;
  user_vote: string | null;
  creator_profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface PollsTabProps {
  communityId: string;
  isMember: boolean;
}

export function PollsTab({ communityId, isMember }: PollsTabProps) {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolls();
  }, [communityId, user]);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      // Fetch polls
      const { data: pollsData, error: pollsError } = await supabase
        .from('community_polls')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      if (!pollsData || pollsData.length === 0) {
        setPolls([]);
        setLoading(false);
        return;
      }

      // Fetch options for all polls
      const pollIds = pollsData.map(p => p.id);
      const { data: optionsData } = await supabase
        .from('community_poll_options')
        .select('*')
        .in('poll_id', pollIds);

      // Fetch votes for all polls
      const { data: votesData } = await supabase
        .from('community_poll_votes')
        .select('*')
        .in('poll_id', pollIds);

      // Fetch creator profiles
      const creatorIds = [...new Set(pollsData.map(p => p.created_by))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', creatorIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Process polls with options and votes
      const enrichedPolls = pollsData.map(poll => {
        const pollOptions = optionsData?.filter(o => o.poll_id === poll.id) || [];
        const pollVotes = votesData?.filter(v => v.poll_id === poll.id) || [];
        
        const userVote = user 
          ? pollVotes.find(v => v.user_id === user.id)?.option_id || null 
          : null;

        const optionsWithVotes = pollOptions.map(option => ({
          id: option.id,
          option_text: option.option_text,
          vote_count: pollVotes.filter(v => v.option_id === option.id).length,
        }));

        return {
          ...poll,
          options: optionsWithVotes,
          total_votes: pollVotes.length,
          user_vote: userVote,
          creator_profile: profilesMap.get(poll.created_by) || null,
        };
      });

      setPolls(enrichedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(2).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isMember && (
        <div className="flex justify-end">
          <CreatePollDialog communityId={communityId} onPollCreated={fetchPolls} />
        </div>
      )}

      {polls.length > 0 ? (
        polls.map(poll => (
          <PollCard 
            key={poll.id} 
            poll={poll} 
            onUpdate={fetchPolls} 
            isMember={isMember}
          />
        ))
      ) : (
        <Card className="border-0 shadow-soft">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No polls yet
            </h3>
            <p className="text-muted-foreground">
              {isMember ? 'Create the first poll!' : 'Join the community to create polls'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
