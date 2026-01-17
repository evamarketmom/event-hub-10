import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  Users, 
  Building2, 
  Hash,
  MapPin,
  TrendingUp
} from 'lucide-react';

interface UserResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
}

interface BusinessResult {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  category: string;
  location: string | null;
}

interface CommunityResult {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count?: number;
}

const BUSINESS_CATEGORIES = [
  { value: 'food', label: 'Food & Beverages', icon: '🍔' },
  { value: 'tech', label: 'Technology', icon: '💻' },
  { value: 'handmade', label: 'Handmade', icon: '🎨' },
  { value: 'services', label: 'Services', icon: '🛠️' },
  { value: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { value: 'retail', label: 'Retail', icon: '🛍️' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'health', label: 'Health', icon: '💊' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [businesses, setBusinesses] = useState<BusinessResult[]>([]);
  const [communities, setCommunities] = useState<CommunityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingBusinesses, setTrendingBusinesses] = useState<BusinessResult[]>([]);

  useEffect(() => {
    fetchTrendingBusinesses();
    if (searchParams.get('q')) {
      handleSearch();
    }
  }, []);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      handleSearch();
    }
  }, [searchParams]);

  const fetchTrendingBusinesses = async () => {
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('is_featured', true)
      .limit(6);
    
    setTrendingBusinesses(data || []);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearchParams({ q: searchQuery });

    try {
      // Search users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, location')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
        .limit(20);

      setUsers(usersData || []);

      // Search businesses
      const { data: businessesData } = await supabase
        .from('businesses')
        .select('id, name, description, logo_url, category, location')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20);

      setBusinesses(businessesData || []);

      // Search communities
      const { data: communitiesData } = await supabase
        .from('communities')
        .select('id, name, description, cover_image_url')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20);

      setCommunities(communitiesData || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category: string) => {
    setLoading(true);
    setActiveTab('businesses');
    
    try {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, description, logo_url, category, location')
        .eq('category', category as any)
        .limit(20);

      setBusinesses(data || []);
      setSearchQuery(`Category: ${category}`);
    } catch (error) {
      console.error('Error fetching category:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalResults = users.length + businesses.length + communities.length;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Explore</h1>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users, businesses, communities..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="gradient-primary text-white">
              Search
            </Button>
          </form>
        </div>

        {/* Categories Grid */}
        {!searchParams.get('q') && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {BUSINESS_CATEGORIES.map((category) => (
                <Card 
                  key={category.value}
                  className="border-0 shadow-soft cursor-pointer card-hover"
                  onClick={() => handleCategoryClick(category.value)}
                >
                  <CardContent className="p-4 text-center">
                    <span className="text-2xl">{category.icon}</span>
                    <p className="text-sm font-medium text-foreground mt-2">{category.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Trending Businesses */}
        {!searchParams.get('q') && trendingBusinesses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Featured Businesses
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trendingBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchParams.get('q') && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                <p className="text-muted-foreground">
                  {totalResults} results for "{searchParams.get('q')}"
                </p>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
                    <TabsTrigger value="users">
                      <Users className="h-4 w-4 mr-1" />
                      Users ({users.length})
                    </TabsTrigger>
                    <TabsTrigger value="businesses">
                      <Building2 className="h-4 w-4 mr-1" />
                      Businesses ({businesses.length})
                    </TabsTrigger>
                    <TabsTrigger value="communities">
                      Communities ({communities.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4 space-y-6">
                    {users.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground">Users</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {users.slice(0, 4).map((user) => (
                            <UserCard key={user.id} user={user} />
                          ))}
                        </div>
                        {users.length > 4 && (
                          <Button variant="link" onClick={() => setActiveTab('users')}>
                            View all {users.length} users
                          </Button>
                        )}
                      </div>
                    )}

                    {businesses.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground">Businesses</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {businesses.slice(0, 4).map((business) => (
                            <BusinessCard key={business.id} business={business} />
                          ))}
                        </div>
                        {businesses.length > 4 && (
                          <Button variant="link" onClick={() => setActiveTab('businesses')}>
                            View all {businesses.length} businesses
                          </Button>
                        )}
                      </div>
                    )}

                    {communities.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground">Communities</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {communities.slice(0, 4).map((community) => (
                            <CommunityCard key={community.id} community={community} />
                          ))}
                        </div>
                      </div>
                    )}

                    {totalResults === 0 && (
                      <Card className="border-0 shadow-soft">
                        <CardContent className="py-12 text-center">
                          <p className="text-muted-foreground">No results found</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="users" className="mt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {users.map((user) => (
                        <UserCard key={user.id} user={user} />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="businesses" className="mt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {businesses.map((business) => (
                        <BusinessCard key={business.id} business={business} />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="communities" className="mt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {communities.map((community) => (
                        <CommunityCard key={community.id} community={community} />
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function UserCard({ user }: { user: UserResult }) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="border-0 shadow-soft cursor-pointer card-hover"
      onClick={() => navigate(`/user/${user.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || ''} />
            <AvatarFallback className="gradient-primary text-white">
              {user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {user.full_name || 'Anonymous'}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              @{user.username || 'user'}
            </p>
            {user.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {user.location}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessCard({ business }: { business: BusinessResult }) {
  const navigate = useNavigate();
  const category = BUSINESS_CATEGORIES.find(c => c.value === business.category);
  
  return (
    <Card 
      className="border-0 shadow-soft cursor-pointer card-hover"
      onClick={() => navigate(`/business/${business.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={business.logo_url || ''} />
            <AvatarFallback className="gradient-secondary text-white">
              {business.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {business.name}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {category?.icon} {category?.label || business.category}
              </Badge>
            </div>
            {business.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {business.location}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommunityCard({ community }: { community: CommunityResult }) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="border-0 shadow-soft cursor-pointer card-hover"
      onClick={() => navigate(`/communities/${community.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl gradient-secondary flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {community.name}
            </p>
            {community.description && (
              <p className="text-sm text-muted-foreground truncate">
                {community.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
