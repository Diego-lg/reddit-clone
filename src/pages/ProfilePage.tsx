import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit, TrendingUp, FileText } from 'lucide-react';
import { supabase, Profile, PostWithAuthor } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PostCard } from '../components/PostCard';

type SortType = 'newest' | 'oldest' | 'highest' | 'lowest';
type FilterType = 'all' | 'text' | 'link';

export function ProfilePage() {
  const { username } = useParams<{ username?: string }>();
  const { user, profile: currentUserProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [filterBy, setFilterBy] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');

  // Determine if viewing own profile
  const isOwnProfile = !username;
  const targetUsername = username || currentUserProfile?.username;

  useEffect(() => {
    // Wait for auth context to finish loading
    if (authLoading) {
      return;
    }

    // Check authentication for own profile
    if (isOwnProfile && !user) {
      navigate('/login');
      return;
    }

    // Need target username to proceed
    if (!targetUsername) {
      setLoading(false);
      return;
    }

    loadProfile();
  }, [targetUsername, user, authLoading, isOwnProfile]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [posts, sortBy, filterBy]);

  async function loadProfile() {
    try {
      setLoading(true);

      // Load profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', targetUsername)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch user votes if logged in
      let userVotes: any[] = [];
      if (user) {
        const { data: votesData } = await supabase
          .from('votes')
          .select('post_id, vote_type')
          .eq('user_id', user.id);
        userVotes = votesData || [];
      }

      // Combine data
      const postsWithAuthors: PostWithAuthor[] = (postsData || []).map(post => ({
        ...post,
        author_username: profileData.username,
        user_vote: userVotes.find(v => v.post_id === post.id)?.vote_type || 0
      }));

      setPosts(postsWithAuthors);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFiltersAndSort() {
    let filtered = [...posts];

    // Apply filter
    if (filterBy === 'text') {
      filtered = filtered.filter(p => p.content && !p.url);
    } else if (filterBy === 'link') {
      filtered = filtered.filter(p => p.url);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest':
          return b.score - a.score;
        case 'lowest':
          return a.score - b.score;
        default:
          return 0;
      }
    });

    setFilteredPosts(filtered);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-orange-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <Link to="/" className="mt-4 inline-block text-orange-600 hover:underline">
            Go back to feed
          </Link>
        </div>
      </div>
    );
  }

  const totalKarma = posts.reduce((sum, post) => sum + post.score, 0);
  const avgScore = posts.length > 0 ? (totalKarma / posts.length).toFixed(1) : '0';
  const topPost = posts.length > 0 ? posts.reduce((max, post) => post.score > max.score ? post : max) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-orange-600">Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover border-2 border-orange-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                  {(profile.display_name || profile.username)[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-grow">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.display_name || profile.username}
                  </h2>
                  {profile.display_name && (
                    <p className="text-sm text-gray-600">u/{profile.username}</p>
                  )}
                </div>
                {isOwnProfile && (
                  <Link
                    to="/profile/edit"
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Profile</span>
                  </Link>
                )}
              </div>

              {profile.bio && (
                <p className="text-gray-700 mb-3">{profile.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{posts.length}</p>
              <p className="text-sm text-gray-600">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{totalKarma}</p>
              <p className="text-sm text-gray-600">Total Karma</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{avgScore}</p>
              <p className="text-sm text-gray-600">Avg Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{topPost?.score || 0}</p>
              <p className="text-sm text-gray-600">Top Post</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                  activeTab === 'posts'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Posts ({posts.length})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                  activeTab === 'about'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                About
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'posts' && (
              <div>
                {/* Filters and Sort */}
                {posts.length > 0 && (
                  <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200">
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortType)}
                        className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="highest">Highest Score</option>
                        <option value="lowest">Lowest Score</option>
                      </select>
                    </div>

                    {/* Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Filter:</span>
                      <select
                        value={filterBy}
                        onChange={(e) => setFilterBy(e.target.value as FilterType)}
                        className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="all">All Posts</option>
                        <option value="text">Text Posts</option>
                        <option value="link">Link Posts</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Posts List */}
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {posts.length === 0 
                        ? 'No posts yet' 
                        : 'No posts match the selected filter'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onVote={loadProfile}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                  {profile.bio ? (
                    <p className="text-gray-700">{profile.bio}</p>
                  ) : (
                    <p className="text-gray-500 italic">No bio provided</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Member since:</span>
                      <span className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total posts:</span>
                      <span className="font-medium">{posts.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total karma:</span>
                      <span className="font-medium">{totalKarma}</span>
                    </div>
                    {topPost && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Most popular post:</span>
                        <span className="font-medium">{topPost.score} points</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
