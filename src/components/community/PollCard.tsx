import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  question: string;
  created_at: string;
  ends_at: string | null;
  is_closed: boolean;
  created_by: string;
  options: PollOption[];
  total_votes: number;
  user_vote: string | null;
  creator_profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface PollCardProps {
  poll: Poll;
  onUpdate: () => void;
  isMember: boolean;
}

export function PollCard({ poll, onUpdate, isMember }: PollCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasVoted = poll.user_vote !== null;
  const isExpired = poll.ends_at && new Date(poll.ends_at) < new Date();
  const isCreator = user?.id === poll.created_by;
  const showResults = hasVoted || poll.is_closed || isExpired;

  const handleVote = async (optionId: string) => {
    if (!user) {
      toast({ title: 'Please sign in to vote', variant: 'destructive' });
      return;
    }

    if (!isMember) {
      toast({ title: 'Join the community to vote', variant: 'destructive' });
      return;
    }

    if (hasVoted) {
      toast({ title: 'You have already voted', variant: 'destructive' });
      return;
    }

    setVoting(true);
    try {
      const { error } = await supabase
        .from('community_poll_votes')
        .insert({
          poll_id: poll.id,
          option_id: optionId,
          user_id: user.id,
        });

      if (error) throw error;
      toast({ title: 'Vote recorded!' });
      onUpdate();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast({ title: 'Error voting', description: error.message, variant: 'destructive' });
    } finally {
      setVoting(false);
    }
  };

  const handleDelete = async () => {
    if (!isCreator) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('community_polls')
        .delete()
        .eq('id', poll.id);

      if (error) throw error;
      toast({ title: 'Poll deleted' });
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting poll:', error);
      toast({ title: 'Error deleting poll', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={poll.creator_profile?.avatar_url || ''} />
              <AvatarFallback className="gradient-primary text-white">
                {poll.creator_profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">
                {poll.creator_profile?.full_name || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(poll.is_closed || isExpired) && (
              <Badge variant="secondary">Closed</Badge>
            )}
            {isCreator && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
          <h3 className="font-semibold text-foreground text-lg">{poll.question}</h3>
        </div>

        <div className="space-y-2">
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0 
              ? Math.round((option.vote_count / poll.total_votes) * 100) 
              : 0;
            const isSelected = poll.user_vote === option.id;

            if (showResults) {
              return (
                <div key={option.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn(
                      "flex items-center gap-2",
                      isSelected && "font-semibold text-primary"
                    )}>
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                      {option.option_text}
                    </span>
                    <span className="text-muted-foreground">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            }

            return (
              <Button
                key={option.id}
                variant="outline"
                className="w-full justify-start h-auto py-3 text-left"
                onClick={() => handleVote(option.id)}
                disabled={voting || !isMember}
              >
                {option.option_text}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
          {poll.ends_at && !isExpired && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ends {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
