import { useState, useEffect, useCallback } from 'react';
import { fetchUnreadReplies, type Reply } from '@/features/reply/replyApi';

export const useReplies = () => {
  const [replies, setReplies] = useState<Reply[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchUnreadReplies();
      setReplies(Array.isArray(data) ? data : []);
    } catch {
      // fail silently — notification is non-critical
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  return { replies, reload: load };
};
