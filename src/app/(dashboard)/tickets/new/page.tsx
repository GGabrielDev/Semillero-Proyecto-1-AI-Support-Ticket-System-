import { TicketForm } from '@/components/tickets/TicketForm';
import { Card } from '@/components/ui/Card';

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Create a new ticket</h1>
        <p className="mt-2 text-sm text-slate-400">Capture the issue clearly so the support team and AI assistant can help fast.</p>
      </div>
      <Card>
        <TicketForm />
      </Card>
    </div>
  );
}
