"use client";

import React, { useState, useTransition } from "react";
import { CommentSummary } from "../../server/agreements/comments";
import {
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
} from "../../server/actions/comments";

interface CommentThreadProps {
  agreementId: string;
  versionId?: string | null;
  termId?: string | null;
  comments: CommentSummary[];
  currentUserId: string;
  isOrganizer: boolean;
  translations: {
    discussionTitle: string;
    noCommentsYet: string;
    addFirstComment: string;
    postCommentPlaceholder: string;
    postCommentButton: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
    edited: string;
    confirmDelete: string;
    loading: string;
  };
}

export function CommentThread({
  agreementId,
  versionId,
  termId,
  comments,
  currentUserId,
  isOrganizer,
  translations,
}: CommentThreadProps) {
  const [newCommentBody, setNewCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim()) return;

    setError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    if (versionId) formData.append("versionId", versionId);
    if (termId) formData.append("termId", termId);
    formData.append("body", newCommentBody.trim());

    startTransition(async () => {
      const res = await createCommentAction(null, formData);
      if (res.success) {
        setNewCommentBody("");
      } else {
        setError(res.error || "Failed to post comment");
      }
    });
  };

  const handleStartEdit = (comment: CommentSummary) => {
    setEditingCommentId(comment.id);
    setEditBody(comment.body);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editBody.trim()) return;

    setError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("commentId", commentId);
    formData.append("body", editBody.trim());

    startTransition(async () => {
      const res = await updateCommentAction(null, formData);
      if (res.success) {
        setEditingCommentId(null);
        setEditBody("");
      } else {
        setError(res.error || "Failed to update comment");
      }
    });
  };

  const handleDelete = (commentId: string) => {
    if (!confirm(translations.confirmDelete)) return;

    setError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("commentId", commentId);

    startTransition(async () => {
      const res = await deleteCommentAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to delete comment");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Thread Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>💬</span>
          <span>{translations.discussionTitle}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {comments.length}
          </span>
        </h4>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
          {error}
        </div>
      )}

      {/* Empty State */}
      {comments.length === 0 && (
        <div className="p-6 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs">
          <p>{translations.noCommentsYet}</p>
          <p className="text-zinc-400 mt-0.5">{translations.addFirstComment}</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => {
          const isAuthor = comment.authorUserId === currentUserId;
          const canDelete = isAuthor || isOrganizer;
          const isEditing = editingCommentId === comment.id;

          return (
            <div
              key={comment.id}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2 text-xs"
            >
              {/* Comment Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {comment.authorName}
                  </strong>
                  {comment.termId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                      #{comment.termId}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  {comment.editedAt && (
                    <span className="italic">{translations.edited}</span>
                  )}
                  <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Comment Body or Edit Input */}
              {isEditing ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(null)}
                      disabled={isPending}
                      className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs"
                    >
                      {translations.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={isPending}
                      className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold"
                    >
                      {isPending ? translations.loading : translations.save}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {comment.body}
                </p>
              )}

              {/* Action buttons (Edit / Delete) */}
              {!isEditing && (isAuthor || canDelete) && (
                <div className="flex items-center justify-end gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(comment)}
                      className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      {translations.edit}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    >
                      {translations.delete}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handlePostComment} className="space-y-2 pt-2">
        <textarea
          rows={2}
          value={newCommentBody}
          onChange={(e) => setNewCommentBody(e.target.value)}
          placeholder={translations.postCommentPlaceholder}
          className="w-full text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
        />

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isPending || !newCommentBody.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors"
          >
            {isPending ? translations.loading : translations.postCommentButton}
          </button>
        </div>
      </form>
    </div>
  );
}
