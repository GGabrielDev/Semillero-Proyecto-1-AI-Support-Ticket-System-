'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

/**
 * Invisible client component that subscribes to Postgres changes for a single
 * ticket row and calls router.refresh() when the row is updated.  This gives
 * users near-real-time status updates without a full page reload.
 */
export function TicketRealtimeSync({ ticketId }: { ticketId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`ticket-sync-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`,
        },
        () => {
          router.refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ticketId, router]);

  return null;
}
