import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { supabase, PostWithAuthor } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PostCard } from '../components/PostCard';

export function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.is_admin) {
      loadPosts();
    }
  }, [profile]);

  async function loadPosts() {
    try {
      // Fetch all posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (postsData && postsData.length > 0) {
        // Fetch author usernames
        const authorIds = [...new Set(postsData.map(post => post.author_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', authorIds);

        // Combine data
        const postsWithAuthors: PostWithAuthor[] = postsData.map(post => ({
          ...post,
          author_username: profiles?.find(p => p.id === post.author_id)?.username || 'Unknown'
        }));

        setPosts(postsWithAuthors);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }

  // Redirect if not admin
  if (!authLoading && (!profile || !profile.is_admin)) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Content Moderation</h3>
                <p className="text-sm text-orange-800">
                  As an admin, you can review and remove inappropriate posts. Use this power responsibly.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Text Posts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {posts.filter(p => p.content).length}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Link Posts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {posts.filter(p => p.url).length}
                </p>
              </div>
            </div>
          </div>

          {/* All Posts */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Posts</h2>
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600">No posts to moderate</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={loadPosts}
                    showDeleteButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
