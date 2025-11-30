import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Shield, RefreshCw, User } from 'lucide-react';
import { supabase, PostWithAuthor } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PostCard } from '../components/PostCard';
import { CreatePostForm } from '../components/CreatePostForm';

export function FeedPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();

    // Subscribe to real-time updates
    const postsChannel = supabase
      .channel('posts_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts'
      }, () => {
        loadPosts();
      })
      .subscribe();

    const votesChannel = supabase
      .channel('votes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes'
      }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [user]);

  async function loadPosts() {
    try {
      setRefreshing(true);
      
      // Fetch posts ordered by score
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('score', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (postsData && postsData.length > 0) {
        // Fetch author usernames
        const authorIds = [...new Set(postsData.map(post => post.author_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', authorIds);

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
        const postsWithAuthors: PostWithAuthor[] = postsData.map(post => ({
          ...post,
          author_username: profiles?.find(p => p.id === post.author_id)?.username || 'Unknown',
          user_vote: userVotes.find(v => v.post_id === post.id)?.vote_type || 0
        }));

        setPosts(postsWithAuthors);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-orange-600">Community Portal</h1>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    {profile?.username}
                  </span>
                  <Link
                    to="/profile"
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                    title="My Profile"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                  {profile?.is_admin && (
                    <Link
                      to="/admin"
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                      title="Admin Dashboard"
                    >
                      <Shield className="w-5 h-5" />
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Create Post Form */}
          <CreatePostForm onPostCreated={loadPosts} />

          {/* Refresh Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {posts.length} {posts.length === 1 ? 'Post' : 'Posts'}
            </h2>
            <button
              onClick={loadPosts}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-orange-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-600">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onVote={loadPosts}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
