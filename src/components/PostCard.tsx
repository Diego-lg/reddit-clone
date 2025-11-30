import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, ExternalLink, Trash2 } from 'lucide-react';
import { supabase, PostWithAuthor } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PostCardProps {
  post: PostWithAuthor;
  onVote?: () => void;
  onDelete?: () => void;
  showDeleteButton?: boolean;
}

export function PostCard({ post, onVote, onDelete, showDeleteButton }: PostCardProps) {
  const { user, profile } = useAuth();
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleVote(voteType: number) {
    if (!user || voting) return;

    setVoting(true);
    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', post.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking same button
          await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);
        } else {
          // Update vote if different
          await supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
        }
      } else {
        // Create new vote
        await supabase
          .from('votes')
          .insert({
            user_id: user.id,
            post_id: post.id,
            vote_type: voteType
          });
      }

      if (onVote) onVote();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(false);
    }
  }

  async function handleDelete() {
    if (!profile?.is_admin || deleting) return;

    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setDeleting(true);
    try {
      // First delete all votes associated with this post
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('post_id', post.id);

      if (votesError) {
        console.error('Error deleting votes:', votesError);
        // Continue with post deletion even if vote deletion fails
      }

      // Then delete the post
      const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (postError) throw postError;

      if (onDelete) onDelete();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  }

  const userVote = post.user_vote || 0;
  const timeAgo = getTimeAgo(post.created_at);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
      <div className="flex">
        {/* Vote buttons */}
        <div className="flex flex-col items-center bg-gray-50 px-4 py-4 gap-1">
          <button
            onClick={() => handleVote(1)}
            disabled={!user || voting}
            className={`p-1 rounded transition ${
              userVote === 1
                ? 'text-orange-600 bg-orange-100'
                : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ArrowUp className="w-6 h-6" />
          </button>
          <span className={`font-bold text-lg ${
            post.score > 0 ? 'text-orange-600' : post.score < 0 ? 'text-blue-600' : 'text-gray-600'
          }`}>
            {post.score}
          </span>
          <button
            onClick={() => handleVote(-1)}
            disabled={!user || voting}
            className={`p-1 rounded transition ${
              userVote === -1
                ? 'text-blue-600 bg-blue-100'
                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        </div>

        {/* Post content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {post.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span>
                  Posted by{' '}
                  <Link 
                    to={`/profile/${post.author_username}`}
                    className="text-orange-600 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.author_username || 'Unknown'}
                  </Link>
                </span>
                <span>•</span>
                <span>{timeAgo}</span>
              </div>
            </div>
            {showDeleteButton && profile?.is_admin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 text-red-500 hover:bg-red-50 rounded transition"
                title="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {post.content && (
            <p className="text-gray-700 mb-2 whitespace-pre-wrap">{post.content}</p>
          )}

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              {new URL(post.url).hostname}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
