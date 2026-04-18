'use client';

import { useState, memo } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Post } from '@/types';
import { useAuth } from '@/context/AuthContext';
import CommentSection from './CommentSection';
import Image from 'next/image';
import Link from 'next/link';
import { FaHeart, FaRegHeart, FaComment, FaShareAlt, FaTrashAlt, FaCheck } from 'react-icons/fa';

interface PostCardProps { post: Post; }

const PostCard = memo(({ post }: PostCardProps) => {
  const { user, profile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLiked = user ? post.likes.includes(user.uid) : false;
  const isOwner = user?.uid === post.userId;
  const isAdmin = profile?.role === 'admin_owner';

  const handleLike = async () => {
    if (!user) return;
    const ref = doc(db, 'posts', post.id);
    if (isLiked) {
      await updateDoc(ref, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(user.uid) });
      if (post.userId !== user.uid) {
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(db, 'notifications'), {
          userId: post.userId,
          message: `أعجب ${profile?.displayName} بمنشورك`,
          read: false, type: 'like', relatedId: post.id, createdAt: serverTimestamp()
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل تريد حذف هذا المنشور؟')) return;
    await deleteDoc(doc(db, 'posts', post.id));
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeAgo = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ar })
    : 'الآن';

  return (
    <article className="card card-hover overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <Link href={`/profile/${post.userId}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
            {post.userPhotoURL ? (
              <Image src={post.userPhotoURL} alt={post.userDisplayName}
                width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-sm"
                style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}>
                {post.userDisplayName?.[0] || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-sm group-hover:text-[var(--color-accent)] transition-colors"
              style={{ color: 'var(--color-text)' }}>
              {post.userDisplayName}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>{timeAgo}</p>
          </div>
        </Link>
        {(isOwner || isAdmin) && (
          <button
            onClick={handleDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10"
            style={{ color: 'var(--color-error)' }}
          >
            <FaTrashAlt className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
          {post.content}
        </p>
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--color-surface-2)' }}>
          <Image src={post.imageUrl} alt="صورة المنشور" fill className="object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={handleLike}
          disabled={!user}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
            isLiked ? 'bg-red-500/8' : 'hover:bg-[var(--color-surface-2)]'
          }`}
          style={{ color: isLiked ? '#f43f5e' : 'var(--color-text-3)' }}
        >
          {isLiked
            ? <FaHeart className={`w-4 h-4 transition-transform ${isLiked ? 'scale-110' : ''}`} />
            : <FaRegHeart className="w-4 h-4" />
          }
          {post.likes.length > 0 && (
            <span className="tabular-nums">{post.likes.length}</span>
          )}
        </button>

        <button
          onClick={() => setShowComments(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-[var(--color-surface-2)]"
          style={{ color: 'var(--color-text-3)' }}
        >
          <FaComment className="w-4 h-4" />
          {post.commentsCount > 0 && (
            <span className="tabular-nums">{post.commentsCount}</span>
          )}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-[var(--color-surface-2)] mr-auto"
          style={{ color: copied ? 'var(--color-success)' : 'var(--color-text-3)' }}
        >
          {copied ? <FaCheck className="w-4 h-4" /> : <FaShareAlt className="w-4 h-4" />}
          {copied && <span className="text-xs">تم النسخ</span>}
        </button>
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          onClose={() => setShowComments(false)}
          authorId={post.userId}
        />
      )}
    </article>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
