import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/feed/PostCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Globe,
  Instagram,
  Youtube,
  Users,
  Image as ImageIcon,
  Heart,
  HeartOff,
  ExternalLink
} from 'lucide-react';

interface BusinessData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  website_url: string | null;
  instagram_link: string | null;
  youtube_link: string | null;
  owner_id: string | null;
  created_at: string | null;
}

interface BusinessImage {
  id: string;
  image_url: string;
  caption: string | null;
}

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  created_at: string;
  user_id: string;
  business_id: string | null;
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
  post_likes: { user_id: string }[];
  comments: { id: string }[];
}

const CATEGORY_INFO: Record<string, { label: string; icon: string }> = {
  food: { label: 'Food & Beverages', icon: '🍔' },
  tech: { label: 'Technology', icon: '💻' },
  handmade: { label: 'Handmade', icon: '🎨' },
  services: { label: 'Services', icon: '🛠️' },
  agriculture: { label: 'Agriculture', icon: '🌾' },
  retail: { label: 'Retail', icon: '🛍️' },
  education: { label: 'Education', icon: '📚' },
  health: { label: 'Health', icon: '💊' },
  finance: { label: 'Finance', icon: '💰' },
  other: { label: 'Other', icon: '📦' },
};

export default function BusinessProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<BusinessImage[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwner = user?.id === business?.owner_id;

  useEffect(() => {
    if (id) {
      fetchBusinessData();
    }
  }, [id, user]);

  const fetchBusinessData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch business
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single();

      if (businessError) throw businessError;
      setBusiness(businessData);

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, full_name, username, avatar_url),
          businesses:business_id (id, name, logo_url),
          post_likes (user_id),
          comments (id)
        `)
        .eq('business_id', id)
        .order('created_at', { ascending: false });

      setPosts(postsData || []);

      // Fetch images
      const { data: imagesData } = await supabase
        .from('business_images')
        .select('*')
        .eq('business_id', id)
        .order('created_at', { ascending: false });

      setImages(imagesData || []);

      // Fetch follower count
      const { count } = await supabase
        .from('business_follows')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', id);

      setFollowerCount(count || 0);

      // Check if following
      if (user) {
        const { data: followCheck } = await supabase
          .from('business_follows')
          .select('id')
          .eq('business_id', id)
          .eq('user_id', user.id)
          .single();

        setIsFollowing(!!followCheck);
      }
    } catch (error) {
      console.error('Error fetching business:', error);
      toast({ title: 'Error loading business', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('business_follows')
          .delete()
          .eq('business_id', id)
          .eq('user_id', user.id);
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
      } else {
        await supabase
          .from('business_follows')
          .insert({ business_id: id, user_id: user.id });
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
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

  if (!business) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Business not found</h1>
          <Button onClick={() => navigate('/explore')}>Explore Businesses</Button>
        </div>
      </MainLayout>
    );
  }

  const categoryInfo = CATEGORY_INFO[business.category] || CATEGORY_INFO.other;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Business Header */}
        <Card className="overflow-hidden border-0 shadow-soft">
          {/* Cover Image */}
          <div 
            className="h-48 gradient-secondary bg-cover bg-center"
            style={business.cover_image_url ? { backgroundImage: `url(${business.cover_image_url})` } : {}}
          />
          
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
              <Avatar className="h-32 w-32 ring-4 ring-background shadow-lg">
                <AvatarImage src={business.logo_url || ''} alt={business.name} />
                <AvatarFallback className="text-3xl gradient-secondary text-white">
                  {business.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 sm:pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{business.name}</h1>
                    <Badge variant="secondary" className="mt-1">
                      {categoryInfo.icon} {categoryInfo.label}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    {isOwner ? (
                      <Button variant="outline" onClick={() => navigate(`/my-businesses/${id}/edit`)}>
                        Edit Business
                      </Button>
                    ) : (
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={!isFollowing ? "gradient-primary text-white" : ""}
                      >
                        {isFollowing ? (
                          <>
                            <HeartOff className="mr-2 h-4 w-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <Heart className="mr-2 h-4 w-4" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Info */}
            <div className="mt-6 space-y-4">
              {business.description && (
                <p className="text-foreground">{business.description}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {business.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {business.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {followerCount} followers
                </span>
              </div>

              {/* Social Links */}
              <div className="flex gap-3">
                {business.website_url && (
                  <a 
                    href={business.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {business.instagram_link && (
                  <a 
                    href={business.instagram_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                )}
                {business.youtube_link && (
                  <a 
                    href={business.youtube_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="gallery">
              <ImageIcon className="h-4 w-4 mr-1" />
              Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4 space-y-4">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={fetchBusinessData} />
              ))
            ) : (
              <Card className="border-0 shadow-soft">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No posts yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="aspect-square rounded-xl overflow-hidden">
                    <img 
                      src={image.image_url} 
                      alt={image.caption || 'Business image'}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-soft">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No images yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
