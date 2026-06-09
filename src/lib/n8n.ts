export async function triggerN8nWorkflow(event: string, payload: Record<string, unknown>) {
  let url = process.env.N8N_WEBHOOK_URL;

  if (event === 'user_created' && process.env.N8N_WELCOME_WEBHOOK_URL) {
    url = process.env.N8N_WELCOME_WEBHOOK_URL;
  }

  if (!url) {
    return;
  }

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event,
      payload,
      timestamp: new Date().toISOString(),
    }),
  }).catch((err: unknown) => console.error('[n8n] workflow trigger failed:', err));
}
