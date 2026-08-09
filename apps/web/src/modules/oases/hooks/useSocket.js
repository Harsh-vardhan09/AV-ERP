// ══════════════════════════════════════════════════════════════════
// OASES Hook — useSocket (Sprint 2 — updated)
// Connects to the existing Socket.io server and wires OASES events
// to React Query cache invalidation for instant UI sync.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../lib/queryKeys';

// const SOCKET_URL = import.meta.env.VITE_PORT || import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_API_URL;
if (!SOCKET_URL) throw new Error('VITE_API_URL not set');

export const useOasesSocket = (enabled = true) => {
  const qc = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });
    socketRef.current = socket;

    // ── Sprint 0/1 events ─────────────────────────────────────────

    socket.on('oases:sheet:status', ({ sheetId, examConfigId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.sheet(sheetId) });
      if (examConfigId)
        qc.invalidateQueries({ queryKey: ['oases', 'sheets', String(examConfigId)] });
    });

    socket.on('oases:assignment:new', () => {
      qc.invalidateQueries({ queryKey: ['oases', 'eval', 'queue'] });
      qc.invalidateQueries({ queryKey: ['oases', 'assignments'] });
    });

    socket.on('oases:conflict:detected', ({ sheetId, examConfigId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.conflicts(examConfigId) });
      qc.invalidateQueries({ queryKey: oasesKeys.conflict(sheetId) });
    });

    socket.on('oases:results:published', ({ examConfigId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.results(examConfigId) });
      // Sprint 6: also refresh report summary and results table
      qc.invalidateQueries({ queryKey: oasesKeys.reports(examConfigId) });
      qc.invalidateQueries({ queryKey: oasesKeys.reportResults(examConfigId) });
    });

    socket.on('oases:notification:new', () => {
      qc.invalidateQueries({ queryKey: oasesKeys.notifications() });
    });

    // ── Sprint 2: Upload pipeline events ─────────────────────────

    // Sheet PDF processing complete
    socket.on('oases:sheet:processed', ({ sheetId, examConfigId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.sheet(sheetId) });
      if (examConfigId)
        qc.invalidateQueries({ queryKey: ['oases', 'sheets', String(examConfigId)] });
    });

    // New sheet uploaded (admin view refresh)
    socket.on('oases:upload:received', ({ examConfigId }) => {
      if (examConfigId)
        qc.invalidateQueries({ queryKey: ['oases', 'sheets', String(examConfigId)] });
    });

    // Processing started (show spinner)
    socket.on('oases:upload:processing', ({ sheetId, examConfigId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.sheet(sheetId) });
      if (examConfigId)
        qc.invalidateQueries({ queryKey: ['oases', 'sheets', String(examConfigId)] });
    });

    return () => {
      socket.off('oases:sheet:status');
      socket.off('oases:assignment:new');
      socket.off('oases:conflict:detected');
      socket.off('oases:results:published');
      socket.off('oases:notification:new');
      socket.off('oases:sheet:processed');
      socket.off('oases:upload:received');
      socket.off('oases:upload:processing');
      socket.disconnect();
    };
  }, [enabled, qc]);

  return socketRef;
};

export default useOasesSocket;
