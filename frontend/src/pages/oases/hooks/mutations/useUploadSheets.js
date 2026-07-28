// ══════════════════════════════════════════════════════════════════
// OASES Hook — useUploadSheets mutation (Sprint 2)
// Tracks per-file upload progress via Axios onUploadProgress.
// ══════════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { uploadService } from '../../services/uploadService';
import toast from 'react-hot-toast';

export const useUploadSheets = () => {
  const qc = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: ({ examConfigId, formData }) =>
      uploadService.uploadSheets(examConfigId, formData, setProgress),

    onSuccess: (data, { examConfigId }) => {
      qc.invalidateQueries({ queryKey: ['oases', 'sheets', examConfigId] });
      setProgress(0);
      const { total, totalSkipped } = data;
      toast.success(
        `${total} sheet(s) uploaded${totalSkipped > 0 ? `, ${totalSkipped} skipped (duplicates)` : ''}.`
      );
    },

    onError: (err) => {
      setProgress(0);
      // ── Log full error for debugging ──
      console.error('[useUploadSheets] Upload failed:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Upload failed. Please try again.';
      toast.error(errorMsg);
    },
  });

  return { ...mutation, progress };
};

export default useUploadSheets;
