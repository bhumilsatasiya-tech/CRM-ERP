import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import React from 'react';

interface Options {
  /** Headline of the modal. Default: "Delete this entry?" */
  title?: string;
  /** Optional secondary line — e.g. "This will also remove its 5 lines." */
  content?: React.ReactNode;
  /** Confirm callback. May return a Promise — modal stays open while it resolves. */
  onOk: () => void | Promise<unknown>;
  /** Optional cancel callback. */
  onCancel?: () => void;
  /** Override "Delete" / "Cancel" labels (e.g. for cancel-document actions). */
  okText?: string;
  cancelText?: string;
  /** Set to false for less-destructive confirmations (e.g. "Cancel this invoice?"). */
  danger?: boolean;
}

/**
 * Centered confirmation modal — used in place of AntD's small <Popconfirm> on every
 * destructive action across the app. Always blocking, always centered, always asks
 * "Are you sure?". This is the single safety rail before anything is deleted.
 *
 * Usage:
 *   <Button danger icon={<DeleteOutlined />}
 *           onClick={() => confirmDelete({
 *             title: 'Delete this partner?',
 *             content: 'You can restore them later from the trash.',
 *             onOk: () => partnerApi.remove(id),
 *           })} />
 */
export function confirmDelete({
  title = 'Delete this entry?',
  content,
  onOk,
  onCancel,
  okText = 'Yes, delete',
  cancelText = 'No, keep it',
  danger = true,
}: Options): void {
  Modal.confirm({
    title,
    content: content ?? 'Are you sure? This action removes the record from active lists. (Soft-deleted — its code becomes available for reuse.)',
    icon: React.createElement(ExclamationCircleOutlined, { style: { color: danger ? '#ff4d4f' : '#faad14' } }),
    centered: true,
    okText,
    cancelText,
    okButtonProps: { danger },
    onOk: async () => {
      // Returning the promise keeps the modal open + ok-button spinning until it resolves.
      try { await onOk(); }
      catch (e) { /* caller surfaces its own error toast — re-throw to keep modal open */ throw e; }
    },
    onCancel,
  });
}
