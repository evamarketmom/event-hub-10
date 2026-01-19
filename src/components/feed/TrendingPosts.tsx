import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface TrendingPost {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
}

export function TrendingPosts() {
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrendingPosts();
  }, []);

  const fetchTrendingPosts = async () => {
    try {
      // Fetch posts with like and comment counts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          user_id,
          profiles:user_id (id, full_name, username, avatar_url),
          businesses:business_id (id, name, logo_url),
          post_likes (id),
          comments (id)
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate engagement and sort by it
      const postsWithEngagement = (postsData || []).map(post => ({
        ...post,
        likes_count: post.post_likes?.length || 0,
        comments_count: post.comments?.length || 0,
        engagement: (post.post_likes?.length || 0) * 2 + (post.comments?.length || 0) * 3
      }));

      // Sort by engagement score and take top 5
      const trending = postsWithEngagement
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 5);

      setPosts(trending);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trending Posts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map((post, index) => (
          <div 
            key={post.id}
            className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={post.businesses?.logo_url || post.profiles?.avatar_url || ''} 
                  alt={post.businesses?.name || post.profiles?.full_name || ''} 
                />
                <AvatarFallback className="gradient-primary text-white text-xs">
                  {(post.businesses?.name || post.profiles?.full_name || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -left-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
              >
                {index + 1}
              </Badge>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {post.businesses?.name || post.profiles?.full_name || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {post.content || 'Shared a post'}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {post.likes_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {post.comments_count}
                </span>
                <span>
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {post.image_url && (
              <img 
                src={post.image_url} 
                alt="" 
                className="h-12 w-12 rounded-lg object-cover shrink-0"
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}