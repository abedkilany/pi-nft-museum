'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '@/lib/community';
import { piApiFetch } from '@/lib/pi-auth-client';
import { CommentBox } from '@/components/community/CommentBox';

export type CommunityFeedComment = {
  id: number;
  body: string;
  createdAt: string;
  authorId: number;
  parentId: number | null;
  author: {
    username: string;
    fullName: string | null;
    profileImage: string | null;
  };
  replies?: CommunityFeedComment[];
};

export type CommunityFeedPost = {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  viewerLiked: boolean;
  authorId: number;
  feedScore?: number;
  author: {
    username: string;
    fullName: string | null;
    profileImage: string | null;
    headline: string | null;
  };
  artwork?: {
    id: number;
    title: string;
    imageUrl: string;
    status: string;
    price: string | number;
    currency: string;
  } | null;
  comments: CommunityFeedComment[];
};

function avatarLabel(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function CommentItem({
  comment,
  postId,
  canInteract,
  depth = 0,
}: {
  comment: CommunityFeedComment;
  postId: number;
  canInteract: boolean;
  depth?: number;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const commentName = comment.author.fullName || comment.author.username;
  const replies = comment.replies || [];

  return (
    <div
      className="card"
      style={{
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        display: 'grid',
        gap: 10,
        marginLeft: depth > 0 ? 18 : 0,
        borderLeft: depth > 0 ? '2px solid rgba(221, 176, 79, 0.18)' : undefined,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Link href={`/profile/${comment.author.username}`} className="profile-avatar" style={{ width: 36, height: 36, textDecoration: 'none' }}>
          {comment.author.profileImage ? (
            <img src={comment.author.profileImage} alt={commentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{avatarLabel(commentName)}</span>
          )}
        </Link>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/profile/${comment.author.username}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
              {commentName}
            </Link>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>@{comment.author.username}</span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>{formatTimeAgo(comment.createdAt)}</span>
          </div>
        </div>
      </div>

      <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{comment.body}</p>

      {depth === 0 ? (
        <div className="card-actions" style={{ gap: 8, marginTop: 0 }}>
          <button className="button secondary" type="button" onClick={() => setReplyOpen((value) => !value)} disabled={!canInteract}>
            {replyOpen ? 'Cancel reply' : `Reply${replies.length ? ` · ${replies.length}` : ''}`}
          </button>
        </div>
      ) : null}

      {replyOpen ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <CommentBox
            postId={postId}
            parentId={comment.id}
            disabled={!canInteract}
            compact
            minRows={2}
            submitLabel="Reply"
            placeholder={canInteract ? `Reply to @${comment.author.username}...` : 'Log in to reply.'}
            onSuccess={() => setReplyOpen(false)}
          />
        </div>
      ) : null}

      {replies.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} postId={postId} canInteract={canInteract} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PostCard({
  post,
  currentUserId,
  canInteract,
}: {
  post: CommunityFeedPost;
  currentUserId?: number | null;
  canInteract: boolean;
}) {
  const router = useRouter();
  const [busyLike, setBusyLike] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [openComments, setOpenComments] = useState(post.comments.length > 0);
  const [message, setMessage] = useState<string | null>(null);

  const displayName = post.author.fullName || post.author.username;
  const ownPost = currentUserId === post.authorId;

  async function toggleLike() {
    if (!canInteract || busyLike) return;
    setBusyLike(true);
    setMessage(null);
    try {
      const response = await piApiFetch('/api/community/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || 'Unable to update like.');
        return;
      }
      router.refresh();
    } finally {
      setBusyLike(false);
    }
  }

  async function deletePost() {
    if (!ownPost || busyDelete) return;
    const confirmed = window.confirm('Delete this post?');
    if (!confirmed) return;
    setBusyDelete(true);
    setMessage(null);
    try {
      const response = await piApiFetch('/api/community/posts/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || 'Unable to delete post.');
        return;
      }
      router.refresh();
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <article className="card" style={{ padding: 20, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href={`/profile/${post.author.username}`} className="profile-avatar" style={{ width: 48, height: 48, textDecoration: 'none' }}>
            {post.author.profileImage ? (
              <img src={post.author.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{avatarLabel(displayName)}</span>
            )}
          </Link>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href={`/profile/${post.author.username}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700 }}>
                {displayName}
              </Link>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>@{post.author.username}</span>
              {typeof post.feedScore === 'number' ? <span className="pill">Score {post.feedScore}</span> : null}
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>
              {formatTimeAgo(post.createdAt)}{post.updatedAt !== post.createdAt ? ' · edited' : ''}
            </p>
          </div>
        </div>
        {ownPost ? (
          <button className="button secondary" type="button" onClick={deletePost} disabled={busyDelete}>
            {busyDelete ? 'Deleting...' : 'Delete'}
          </button>
        ) : null}
      </div>

      <p style={{ margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.body}</p>

      {post.artwork ? (
        <Link
          href={`/artwork/${post.artwork.id}`}
          className="card"
          style={{
            padding: 12,
            display: 'grid',
            gap: 12,
            gridTemplateColumns: '96px minmax(0, 1fr)',
            textDecoration: 'none',
            color: 'inherit',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <img
            src={post.artwork.imageUrl}
            alt={post.artwork.title}
            style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12 }}
          />
          <div style={{ minWidth: 0, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 16 }}>{post.artwork.title}</strong>
              <span className="pill">{post.artwork.status}</span>
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>
              Linked artwork · {Number(post.artwork.price).toFixed(2)} {post.artwork.currency}
            </span>
            <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>Open artwork</span>
          </div>
        </Link>
      ) : null}

      <div className="card-actions" style={{ gap: 8, marginTop: 0 }}>
        <button className="button secondary" type="button" onClick={toggleLike} disabled={!canInteract || busyLike}>
          {post.viewerLiked ? 'Unlike' : 'Like'} · {post.likesCount}
        </button>
        <button className="button secondary" type="button" onClick={() => setOpenComments((value) => !value)}>
          {openComments ? 'Hide comments' : 'Comments'} · {post.commentsCount}
        </button>
      </div>

      {message ? <span style={{ color: '#f87171', fontSize: 13 }}>{message}</span> : null}

      {openComments ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {post.comments.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {post.comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} postId={post.id} canInteract={canInteract} />
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>No comments yet. Start the conversation.</p>
          )}
          <CommentBox postId={post.id} disabled={!canInteract} />
        </div>
      ) : null}
    </article>
  );
}
