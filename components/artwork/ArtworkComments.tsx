'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '../../lib/pi-auth-client';

type CommentType = 'FIRST_COMMENT' | 'REPLY' | 'ARTIST_REPLY';

type ArtworkCommentItem = {
  id: number;
  body: string;
  createdAt: string;
  authorId: number;
  parentId?: number | null;
  commentKind: CommentType;
  stanceType?: string | null;
  scoreImpact: number;
  hiddenByArtist?: boolean;
  hiddenByModerator?: boolean;
  likesCount?: number;
  viewerLiked?: boolean;
  author: {
    username: string;
    fullName?: string | null;
    profileImage?: string | null;
  };
};

const STANCE_LABELS: Record<string, string> = {
  SUPPORT_PUBLISH: 'Support Publish',
  SUPPORT_PREMIUM: 'Support Premium',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  RECOMMEND_REMOVAL: 'Recommend Removal',
};

function avatarLabel(comment: ArtworkCommentItem) {
  return (comment.author.fullName || comment.author.username).slice(0, 1).toUpperCase();
}

function sortComments(comments: ArtworkCommentItem[], repliesMap: Map<number, ArtworkCommentItem[]>) {
  const engagementScore = (comment: ArtworkCommentItem): number => {
    const replies = repliesMap.get(comment.id) || [];
    const nested = replies.reduce((sum, reply) => sum + engagementScore(reply), 0);
    return Number(comment.likesCount || 0) * 3 + replies.length * 2 + Number(comment.scoreImpact || 0) + nested * 0.2;
  };
  return [...comments].sort((a, b) => {
    const diff = engagementScore(b) - engagementScore(a);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function InlineReplyForm({
  label,
  body,
  busy,
  onBodyChange,
  onSubmit,
  onCancel,
}: {
  label: string;
  body: string;
  busy: boolean;
  onBodyChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="card" style={{ padding: '12px', display: 'grid', gap: '10px', background: 'rgba(255,255,255,0.02)' }}>
      <strong style={{ fontSize: '14px' }}>{label}</strong>
      <textarea value={body} onChange={(e) => onBodyChange(e.target.value)} rows={3} placeholder="Write your reply here." />
      <div className="card-actions" style={{ gap: '8px' }}>
        <button className="button primary" type="button" onClick={onSubmit} disabled={busy || body.trim().length < 2}>{busy ? 'Saving...' : 'Post reply'}</button>
        <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  repliesMap,
  currentUserId,
  canModerate,
  canHide,
  canComment,
  activeReplyId,
  replyBody,
  replyBusy,
  onReply,
  onReplyBodyChange,
  onSubmitReply,
  onCancelReply,
  onDelete,
  onEdit,
  onHide,
  onReport,
  onToggleLike,
}: {
  comment: ArtworkCommentItem;
  repliesMap: Map<number, ArtworkCommentItem[]>;
  currentUserId?: number | null;
  canModerate?: boolean;
  canHide?: boolean;
  canComment: boolean;
  activeReplyId?: number | null;
  replyBody: string;
  replyBusy: boolean;
  onReply: (comment: ArtworkCommentItem) => void;
  onReplyBodyChange: (value: string) => void;
  onSubmitReply: (comment: ArtworkCommentItem) => void;
  onCancelReply: () => void;
  onDelete: (commentId: number) => void;
  onEdit: (comment: ArtworkCommentItem) => void;
  onHide: (commentId: number, hidden: boolean) => void;
  onReport: (commentId: number) => void;
  onToggleLike: (commentId: number) => void;
}) {
  const displayName = comment.author.fullName || comment.author.username;
  const hidden = Boolean(comment.hiddenByArtist || comment.hiddenByModerator);
  const own = currentUserId && currentUserId === comment.authorId;
  const replies = sortComments(repliesMap.get(comment.id) || [], repliesMap);
  return (
    <div className="card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="profile-avatar" style={{ width: 44, height: 44 }}>
            {comment.author.profileImage ? <img src={comment.author.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{avatarLabel(comment)}</span>}
          </div>
          <div>
            <strong>{displayName}</strong>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>@{comment.author.username} · {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt))}</p>
          </div>
        </div>
        <div className="card-actions" style={{ gap: '8px' }}>
          {comment.commentKind === 'FIRST_COMMENT' && comment.stanceType ? <span className="pill">{STANCE_LABELS[comment.stanceType] || comment.stanceType} · {comment.scoreImpact >= 0 ? '+' : ''}{comment.scoreImpact}</span> : null}
          {comment.commentKind !== 'FIRST_COMMENT' ? <span className="pill">{comment.commentKind === 'ARTIST_REPLY' ? 'Artist reply' : 'Reply'} · {comment.scoreImpact >= 0 ? '+' : ''}{comment.scoreImpact}</span> : null}
        </div>
      </div>

      <p style={{ margin: 0, color: hidden ? 'var(--muted)' : 'inherit' }}>{hidden ? 'This comment is hidden from the public view, but its score contribution is preserved.' : comment.body}</p>

      <div className="card-actions" style={{ gap: '8px', flexWrap: 'wrap' }}>
        {canComment ? <button className="button secondary" type="button" onClick={() => onReply(comment)}>{activeReplyId === comment.id ? 'Replying…' : 'Reply'}</button> : null}
        {currentUserId && currentUserId !== comment.authorId ? <button className="button secondary" type="button" onClick={() => onToggleLike(comment.id)}>{comment.viewerLiked ? 'Unlike' : 'Like'}{Number(comment.likesCount || 0) > 0 ? ` (${comment.likesCount})` : ''}</button> : <span className="pill">Likes: {Number(comment.likesCount || 0)}</span>}
        {own ? <button className="button secondary" type="button" onClick={() => onEdit(comment)}>Edit</button> : null}
        {own || canModerate ? <button className="button secondary" type="button" onClick={() => onDelete(comment.id)}>Delete</button> : null}
        {canHide ? <button className="button secondary" type="button" onClick={() => onHide(comment.id, !hidden)}>{hidden ? 'Show comment' : 'Hide comment'}</button> : null}
        {!own && currentUserId ? <button className="button secondary" type="button" onClick={() => onReport(comment.id)}>Report</button> : null}
      </div>

      {activeReplyId === comment.id ? (
        <InlineReplyForm
          label={`Reply to @${comment.author.username}`}
          body={replyBody}
          busy={replyBusy}
          onBodyChange={onReplyBodyChange}
          onSubmit={() => onSubmitReply(comment)}
          onCancel={onCancelReply}
        />
      ) : null}

      {replies.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px', paddingLeft: '16px', borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
          {replies.map((reply: any) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              repliesMap={repliesMap}
              currentUserId={currentUserId}
              canModerate={canModerate}
              canHide={canHide}
              canComment={canComment}
              activeReplyId={activeReplyId}
              replyBody={replyBody}
              replyBusy={replyBusy}
              onReply={onReply}
              onReplyBodyChange={onReplyBodyChange}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
              onDelete={onDelete}
              onEdit={onEdit}
              onHide={onHide}
              onReport={onReport}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ArtworkComments({
  artworkId,
  comments,
  canComment,
  currentUserId,
  canModerate,
  canHide,
}: {
  artworkId: number;
  comments: ArtworkCommentItem[];
  canComment: boolean;
  currentUserId?: number | null;
  canModerate?: boolean;
  canHide?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [stanceType, setStanceType] = useState('SUPPORT_PUBLISH');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<ArtworkCommentItem | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const { topLevel, repliesMap, currentUserFirstComment } = useMemo(() => {
    const top = comments.filter((comment: any) => !comment.parentId);
    const map = new Map<number, ArtworkCommentItem[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const list = map.get(comment.parentId) || [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return {
      topLevel: sortComments(top, map),
      repliesMap: map,
      currentUserFirstComment: comments.find((comment: any) => comment.authorId === currentUserId && comment.commentKind === 'FIRST_COMMENT') || null,
    };
  }, [comments, currentUserId]);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const endpoint = editing ? '/api/artworks/comments/edit' : '/api/artworks/comments';
    const payload = editing
      ? { commentId: editing.id, body, stanceType: editing.commentKind === 'FIRST_COMMENT' ? stanceType : undefined }
      : { artworkId, body, stanceType: currentUserFirstComment ? undefined : stanceType, parentId: null };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.error || data.message || 'Done.');
    if (response.ok) {
      setBody('');
      setEditing(null);
      router.refresh();
    }
  }

  async function submitReply(comment: ArtworkCommentItem) {
    setBusy(true);
    setMessage('');
    const response = await piApiFetch('/api/artworks/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId, body: replyBody, parentId: comment.id }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.error || data.message || 'Done.');
    if (response.ok) {
      setReplyBody('');
      setActiveReplyId(null);
      router.refresh();
    }
  }

  async function deleteComment(commentId: number) {
    if (!confirm('Delete this comment?')) return;
    const response = await piApiFetch('/api/artworks/comments/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    });
    const data = await response.json();
    setMessage(data.error || data.message || 'Done.');
    if (response.ok) router.refresh();
  }

  async function hideComment(commentId: number, hidden: boolean) {
    const response = await piApiFetch('/api/artworks/comments/hide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, hidden }),
    });
    const data = await response.json();
    setMessage(data.error || data.message || 'Done.');
    if (response.ok) router.refresh();
  }

  async function reportComment(commentId: number) {
    const reason = window.prompt('Report reason (SPAM / ABUSE / COPYRIGHT / OTHER)', 'OTHER');
    if (!reason) return;
    const description = window.prompt('Optional note for the moderation team', '');
    const response = await piApiFetch('/api/artworks/comments/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, reason, description }),
    });
    const data = await response.json();
    setMessage(data.error || data.message || 'Done.');
  }

  async function toggleLike(commentId: number) {
    const response = await piApiFetch('/api/artworks/comments/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    });
    const data = await response.json();
    setMessage(data.error || data.message || 'Done.');
    if (response.ok) router.refresh();
  }

  function startReply(comment: ArtworkCommentItem) {
    setEditing(null);
    setActiveReplyId((current) => current === comment.id ? null : comment.id);
    setReplyBody('');
    setMessage('');
  }

  function startEdit(comment: ArtworkCommentItem) {
    setActiveReplyId(null);
    setEditing(comment);
    setBody(comment.body);
    setStanceType(comment.stanceType || 'SUPPORT_PUBLISH');
    setMessage('');
  }

  function resetForm() {
    setBody('');
    setEditing(null);
    setMessage('');
    setStanceType('SUPPORT_PUBLISH');
  }

  const formLabel = editing ? 'Edit comment' : currentUserFirstComment ? 'Join the discussion' : 'Add your first comment';

  return (
    <section className="card" style={{ padding: '24px', display: 'grid', gap: '18px' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Discussion</span>
          <h2>Artwork comments</h2>
        </div>
        <p>{comments.length} comment{comments.length === 1 ? '' : 's'}</p>
      </div>

      {canComment ? (
        <form onSubmit={submitComment} className="upload-form" style={{ padding: 0 }}>
          <div className="form-grid">
            {!currentUserFirstComment || editing?.commentKind === 'FIRST_COMMENT' ? (
              <label>
                <span>First comment reason</span>
                <select value={stanceType} onChange={(e) => setStanceType(e.target.value)} disabled={Boolean(currentUserFirstComment && !editing)}>
                  <option value="SUPPORT_PUBLISH">Support Publish</option>
                  <option value="SUPPORT_PREMIUM">Support Premium</option>
                  <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
                  <option value="RECOMMEND_REMOVAL">Recommend Removal</option>
                </select>
              </label>
            ) : null}
            <label className="full-width">
              <span>{formLabel}</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={currentUserFirstComment ? 'Add a new top-level comment.' : 'Post your first comment and choose your recommendation above.'} />
            </label>
          </div>
          <div className="form-actions">
            <button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Post comment'}</button>
            {editing ? <button className="button secondary" type="button" onClick={resetForm}>Cancel</button> : null}
            {message ? <p className="form-message">{message}</p> : null}
          </div>
        </form>
      ) : <p style={{ color: 'var(--muted)' }}>Comments are open for Pi-authenticated users only.</p>}

      <div style={{ display: 'grid', gap: '16px' }}>
        {topLevel.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)' }}>No comments yet.</p> : topLevel.map((comment: any) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            repliesMap={repliesMap}
            currentUserId={currentUserId}
            canModerate={canModerate}
            canHide={canHide}
            canComment={canComment}
            activeReplyId={activeReplyId}
            replyBody={replyBody}
            replyBusy={busy}
            onReply={startReply}
            onReplyBodyChange={setReplyBody}
            onSubmitReply={submitReply}
            onCancelReply={() => setActiveReplyId(null)}
            onDelete={deleteComment}
            onEdit={startEdit}
            onHide={hideComment}
            onReport={reportComment}
            onToggleLike={toggleLike}
          />
        ))}
      </div>
    </section>
  );
}