// ══════════════════════════════════════════════════════════════════
// OASES Hooks — Exam Config Mutations (Sprint 1)
// ══════════════════════════════════════════════════════════════════
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { examConfigService } from '../../services/examConfigService';
import toast from 'react-hot-toast';

export const useCreateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => examConfigService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oases', 'examConfigs'] });
      toast.success('Exam config created!');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create exam config';
      const details = err?.response?.data?.error;
      toast.error(Array.isArray(details) ? details.map(e => e.message).join(', ') : msg);
    },
  });
};

export const useUpdateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => examConfigService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.examConfig(id) });
      qc.invalidateQueries({ queryKey: ['oases', 'examConfigs'] });
      toast.success('Exam config updated!');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update exam config';
      toast.error(msg);
    },
  });
};

export const useUpdateExamStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => examConfigService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.examConfig(id) });
      qc.invalidateQueries({ queryKey: ['oases', 'examConfigs'] });
      toast.success('Status updated!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });
};

export const useDeleteExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => examConfigService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oases', 'examConfigs'] });
      toast.success('Exam config archived.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to archive exam config');
    },
  });
};

// Backwards compat re-exports (Sprint 0 names)
export const useCreateExamConfig = useCreateExam;
export const useUpdateExamConfig = useUpdateExam;
