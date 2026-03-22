'use client';

import Link from 'next/link';
import { useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminReportsPage() {
  const { data, loading, error, reload } = useAdminData<{ artworkReports: any[]; commentReports: any[] }>('/api/admin/reports/list');
  const [message, setMessage] = useState('');

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const formData = new FormData(event.currentTarget);
    const response = await piApiFetch('/api/admin/reports/update', { method: 'POST', body: formData });
    setMessage(response.ok ? 'Report updated.' : 'Failed to update report.');
    if (response.ok) reload();
  }

  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading reports…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load reports.'}</p></div>;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact"><div><span className="section-kicker">Safety</span><h1>Reports</h1></div><p>Moderate artwork and comment reports from one place.</p></div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
      <section style={{ display: 'grid', gap: '16px' }}>
        <div className="section-head compact"><div><span className="section-kicker">Artwork moderation</span><h2>Artwork reports</h2></div></div>
        {data.artworkReports.length === 0 ? <div className="card" style={{ padding: '24px' }}><p style={{ margin: 0 }}>No artwork reports yet.</p></div> : data.artworkReports.map((report: any) => (
          <article key={`art-${report.id}`} className="card" style={{ padding: '20px', display: 'grid', gap: '16px' }}>
            <div className="section-head compact"><div><span className="section-kicker">{report.reason}</span><h2 style={{ marginBottom: 6 }}>Artwork report #{report.id} · {report.artwork.title}</h2><p style={{ margin: 0, color: 'var(--muted)' }}>Reported by @{report.reporter.username} · Artist @{report.artwork.artist.username} · Status {report.status}</p></div><div className="card-actions"><Link href={`/artwork/${report.artworkId}`} className="button secondary">Open artwork</Link></div></div>
            <div className="form-grid"><div className="card" style={{ padding: '16px' }}><strong>Details</strong><p style={{ marginBottom: 0, color: 'var(--muted)' }}>{report.description || 'No description added.'}</p></div><div className="card" style={{ padding: '16px' }}><strong>Evidence links</strong><div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>{report.originalWorkLink ? <a href={report.originalWorkLink} target="_blank">Original work link</a> : <span style={{ color: 'var(--muted)' }}>No original work link</span>}{report.evidenceLink ? <a href={report.evidenceLink} target="_blank">External evidence link</a> : <span style={{ color: 'var(--muted)' }}>No extra evidence link</span>}{report.evidenceFiles.length > 0 ? report.evidenceFiles.map((file: any) => <a key={file.id} href={file.fileUrl} target="_blank">{file.originalName || 'Evidence file'}</a>) : <span style={{ color: 'var(--muted)' }}>No uploaded files</span>}</div></div></div>
            <form onSubmit={submitForm} className="form-grid"><input type="hidden" name="reportType" value="artwork" /><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="artworkId" value={report.artworkId} /><label><span>Review status</span><select name="status" defaultValue={report.status}><option value="PENDING">Pending</option><option value="UNDER_REVIEW">Under review</option><option value="RESOLVED">Resolved</option><option value="REJECTED">Rejected</option></select></label><label><span>Artwork action</span><select name="artworkAction" defaultValue="keep"><option value="keep">Keep current artwork status</option><option value="pending">Move artwork to pending</option><option value="review_again">Send to review again</option><option value="restore_previous">Restore previous status</option></select></label><label className="full-width"><span>Admin note</span><textarea name="adminNote" rows={3} defaultValue={report.adminNote || ''} placeholder="Internal note for the moderation team" /></label><div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: 0 }}><button className="button primary" type="submit">Save review</button>{report.reviewedBy ? <span className="pill">Last reviewed by @{report.reviewedBy.username}</span> : null}</div></form>
          </article>
        ))}
      </section>
      <section style={{ display: 'grid', gap: '16px' }}>
        <div className="section-head compact"><div><span className="section-kicker">Comment moderation</span><h2>Comment reports</h2></div></div>
        {data.commentReports.length === 0 ? <div className="card" style={{ padding: '24px' }}><p style={{ margin: 0 }}>No comment reports yet.</p></div> : data.commentReports.map((report: any) => (
          <article key={`comment-${report.id}`} className="card" style={{ padding: '20px', display: 'grid', gap: '16px' }}>
            <div className="section-head compact"><div><span className="section-kicker">{report.reason}</span><h2 style={{ marginBottom: 6 }}>Comment report #{report.id}</h2><p style={{ margin: 0, color: 'var(--muted)' }}>Comment by @{report.comment.author.username} on {report.comment.artwork.title} · Reported by @{report.reporter.username} · Status {report.status}</p></div><div className="card-actions"><Link href={`/artwork/${report.comment.artworkId}`} className="button secondary">Open artwork</Link></div></div>
            <div className="card" style={{ padding: '16px' }}><strong>Comment body</strong><p style={{ marginBottom: 0, color: 'var(--muted)' }}>{report.comment.body}</p></div>
            <form onSubmit={submitForm} className="form-grid"><input type="hidden" name="reportType" value="comment" /><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="commentId" value={report.commentId} /><input type="hidden" name="commentAuthorId" value={report.comment.authorId} /><label><span>Review status</span><select name="status" defaultValue={report.status}><option value="PENDING">Pending</option><option value="UNDER_REVIEW">Under review</option><option value="RESOLVED">Resolved</option><option value="REJECTED">Rejected</option></select></label><label><span>Comment action</span><select name="commentAction" defaultValue="keep"><option value="keep">Keep comment as is</option><option value="remove_score_only">Remove score effect only</option><option value="hide_and_remove_score">Hide comment and remove score</option><option value="delete">Delete comment completely</option></select></label><label><span>Notify comment author</span><select name="notifyAuthor" defaultValue="false"><option value="false">Do not notify</option><option value="true">Send notification</option></select></label><label className="full-width"><span>Admin note</span><textarea name="adminNote" rows={3} defaultValue={report.adminNote || ''} placeholder="Optional note or reason for this moderation decision" /></label><div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: 0 }}><button className="button primary" type="submit">Save review</button>{report.reviewedBy ? <span className="pill">Last reviewed by @{report.reviewedBy.username}</span> : null}</div></form>
          </article>
        ))}
      </section>
    </div>
  );
}
