import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/feed/PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, error, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      if (!id) throw new Error('Post ID required');
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, full_name, username, avatar_url, is_verified),
          businesses (id, name, logo_url),
          post_likes (user_id),
          comments (id)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Post not found');
      
      return data;
    },
    enabled: !!id,
  });

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive text-lg mb-4">
              {error instanceof Error ? error.message : 'Failed to load post'}
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        )}

        {post && (
          <PostCard post={post} onUpdate={() => refetch()} />
        )}
      </div>
    </MainLayout>
  );
}
