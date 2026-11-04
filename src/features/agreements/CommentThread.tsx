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
    <div className="space-y-4 font-reading">
      {/* Thread Header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-dashed border-[var(--dp-color-line)] pb-2">
        <h4 className="text-base font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
          <span>💬</span>
          <span>{translations.discussionTitle}</span>
          <span className="text-xs px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)]">
            {comments.length}
          </span>
        </h4>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-[6px_3px_8px_4px] bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)]">
          {error}
        </div>
      )}

      {/* Empty State */}
      {comments.length === 0 && (
        <div className="sketch-card p-6 text-center text-[var(--dp-color-ink-muted)] text-sm">
          <p>{translations.noCommentsYet}</p>
          <p className="text-xs mt-0.5">{translations.addFirstComment}</p>
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
              className="sketch-card p-4 space-y-2 text-xs relative rotate-[-0.2deg] hover:rotate-0 transition-transform"
            >
              {/* Comment Header */}
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--dp-color-line)] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)] font-bold font-marker flex items-center justify-center text-[10px]">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <strong className="text-[var(--dp-color-ink)] font-marker text-xs">
                    {comment.authorName}
                  </strong>
                  {comment.termId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[3px_2px_4px_2px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-mono">
                      #{comment.termId}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[var(--dp-color-ink-muted)]">
                  {comment.editedAt && (
                    <span className="italic">{translations.edited}</span>
                  )}
                  <span className="font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Comment Body or Edit Input */}
              {isEditing ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full p-2.5"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(null)}
                      disabled={isPending}
                      className="sketch-btn sketch-btn-outline px-2.5 py-1 text-xs font-marker"
                    >
                      {translations.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={isPending}
                      className="sketch-btn sketch-btn-primary px-2.5 py-1 text-xs font-marker"
                    >
                      {isPending ? translations.loading : translations.save}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[var(--dp-color-ink)] text-sm whitespace-pre-wrap leading-relaxed">
                  {comment.body}
                </p>
              )}

              {/* Action buttons (Edit / Delete) */}
              {!isEditing && (isAuthor || canDelete) && (
                <div className="flex items-center justify-end gap-3 pt-1 border-t border-dashed border-[var(--dp-color-line)] text-xs">
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(comment)}
                      className="text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] font-marker font-bold"
                    >
                      {translations.edit}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-[var(--dp-color-accent)] hover:underline font-marker font-bold"
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
          className="w-full text-sm p-3 font-reading"
        />

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isPending || !newCommentBody.trim()}
            className="sketch-btn sketch-btn-primary px-4 py-2 text-xs font-marker disabled:opacity-50"
          >
            {isPending ? translations.loading : translations.postCommentButton}
          </button>
        </div>
      </form>
    </div>
  );
}
