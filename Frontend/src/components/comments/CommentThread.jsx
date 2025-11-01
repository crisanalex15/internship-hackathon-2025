import { useState, useEffect } from 'react';
import './CommentThread.css';

/**
 * Componentă pentru afișarea și gestionarea comentariilor threaded pe un review
 */
const CommentThread = ({ reviewId, filePath = null }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [filter, setFilter] = useState('all'); // all, open, resolved

    useEffect(() => {
        loadComments();
    }, [reviewId, filePath]);

    const loadComments = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const url = filePath
                ? `/api/comment/review/${reviewId}/file?filePath=${encodeURIComponent(filePath)}`
                : `/api/comment/review/${reviewId}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setComments(data.comments || []);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/comment', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reviewId,
                    filePath: filePath || '',
                    lineNumber: 0,
                    message: newComment,
                    commentType: 'comment'
                })
            });

            const data = await response.json();
            if (data.success) {
                setNewComment('');
                await loadComments();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleAddReply = async (parentId) => {
        if (!replyText.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/comment/${parentId}/reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: replyText
                })
            });

            const data = await response.json();
            if (data.success) {
                setReplyText('');
                setReplyingTo(null);
                await loadComments();
            }
        } catch (error) {
            console.error('Error adding reply:', error);
        }
    };

    const handleResolve = async (commentId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/comment/${commentId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            await loadComments();
        } catch (error) {
            console.error('Error resolving comment:', error);
        }
    };

    const handleReopen = async (commentId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/comment/${commentId}/reopen`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            await loadComments();
        } catch (error) {
            console.error('Error reopening comment:', error);
        }
    };

    const handleDelete = async (commentId) => {
        if (!confirm('Sigur vrei să ștergi acest comentariu?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/comment/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            await loadComments();
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const getSeverityClass = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'severity-critical';
            case 'high': return 'severity-high';
            case 'medium': return 'severity-medium';
            case 'low': return 'severity-low';
            default: return '';
        }
    };

    const getTypeIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'suggestion': return '💡';
            case 'question': return '❓';
            case 'issue': return '🐛';
            case 'praise': return '👍';
            default: return '💬';
        }
    };

    const filteredComments = comments.filter(comment => {
        if (filter === 'all') return true;
        if (filter === 'open') return comment.status === 'open';
        if (filter === 'resolved') return comment.status === 'resolved';
        return true;
    });

    if (loading) {
        return <div className="comment-thread-loading">Se încarcă comentariile...</div>;
    }

    return (
        <div className="comment-thread">
            <div className="comment-thread-header">
                <h3>💬 Comentarii ({comments.length})</h3>
                <div className="comment-filter">
                    <button 
                        className={filter === 'all' ? 'active' : ''} 
                        onClick={() => setFilter('all')}
                    >
                        Toate ({comments.length})
                    </button>
                    <button 
                        className={filter === 'open' ? 'active' : ''} 
                        onClick={() => setFilter('open')}
                    >
                        Deschise ({comments.filter(c => c.status === 'open').length})
                    </button>
                    <button 
                        className={filter === 'resolved' ? 'active' : ''} 
                        onClick={() => setFilter('resolved')}
                    >
                        Rezolvate ({comments.filter(c => c.status === 'resolved').length})
                    </button>
                </div>
            </div>

            <div className="comment-list">
                {filteredComments.length === 0 ? (
                    <div className="no-comments">
                        Nu există comentarii {filter !== 'all' && `cu status "${filter}"`}.
                    </div>
                ) : (
                    filteredComments.map(comment => (
                        <div key={comment.id} className={`comment-item ${comment.status}`}>
                            <div className="comment-header">
                                <span className="comment-icon">{getTypeIcon(comment.commentType)}</span>
                                <span className="comment-author">{comment.authorName}</span>
                                {comment.severity && (
                                    <span className={`comment-severity ${getSeverityClass(comment.severity)}`}>
                                        {comment.severity}
                                    </span>
                                )}
                                <span className="comment-location">
                                    {comment.filePath}:{comment.lineNumber}
                                </span>
                                <span className="comment-date">
                                    {new Date(comment.createdAt).toLocaleString('ro-RO')}
                                </span>
                                <span className={`comment-status status-${comment.status}`}>
                                    {comment.status === 'resolved' ? '✓ Rezolvat' : '○ Deschis'}
                                </span>
                            </div>

                            <div className="comment-body">
                                {comment.message}
                            </div>

                            <div className="comment-actions">
                                <button 
                                    className="btn-reply"
                                    onClick={() => setReplyingTo(comment.id)}
                                >
                                    💬 Răspunde
                                </button>
                                
                                {comment.status === 'open' ? (
                                    <button 
                                        className="btn-resolve"
                                        onClick={() => handleResolve(comment.id)}
                                    >
                                        ✓ Marchează rezolvat
                                    </button>
                                ) : (
                                    <button 
                                        className="btn-reopen"
                                        onClick={() => handleReopen(comment.id)}
                                    >
                                        ↻ Redeschide
                                    </button>
                                )}

                                <button 
                                    className="btn-delete"
                                    onClick={() => handleDelete(comment.id)}
                                >
                                    🗑️ Șterge
                                </button>
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="comment-replies">
                                    {comment.replies.map(reply => (
                                        <div key={reply.id} className="reply-item">
                                            <div className="reply-header">
                                                <span className="reply-author">{reply.authorName}</span>
                                                <span className="reply-date">
                                                    {new Date(reply.createdAt).toLocaleString('ro-RO')}
                                                </span>
                                            </div>
                                            <div className="reply-body">
                                                {reply.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reply Form */}
                            {replyingTo === comment.id && (
                                <div className="reply-form">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Scrie un răspuns..."
                                        rows={3}
                                    />
                                    <div className="reply-form-actions">
                                        <button 
                                            className="btn-submit"
                                            onClick={() => handleAddReply(comment.id)}
                                        >
                                            Trimite
                                        </button>
                                        <button 
                                            className="btn-cancel"
                                            onClick={() => {
                                                setReplyingTo(null);
                                                setReplyText('');
                                            }}
                                        >
                                            Anulează
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* New Comment Form */}
            <div className="new-comment-form">
                <h4>Adaugă comentariu nou</h4>
                <form onSubmit={handleAddComment}>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Scrie un comentariu..."
                        rows={4}
                        required
                    />
                    <button type="submit" className="btn-submit">
                        📝 Adaugă comentariu
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CommentThread;

