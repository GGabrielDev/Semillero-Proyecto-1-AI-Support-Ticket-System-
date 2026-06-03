export async function triggerN8nWorkflow(event: string, payload: Record<string, unknown>) {
  let url = process.env.N8N_WEBHOOK_URL;

  // Enable test mode if N8N_TEST_MODE is true,
  // or if in development environment and N8N_TEST_MODE is not explicitly false.
  const isTestMode =
    process.env.N8N_TEST_MODE === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.N8N_TEST_MODE !== 'false');

  const testUrl = process.env.N8N_WEBHOOK_TEST_URL || process.env.N8N_WEBHOOK_URL_TEST;

  if (isTestMode) {
    if (testUrl) {
      url = testUrl;
    } else if (url) {
      // Auto-convert standard production webhook URL to test webhook URL by replacing '/webhook/' with '/webhook-test/'
      url = url.replace('/webhook/', '/webhook-test/');
    }
  }

  if (!url) {
    if (isTestMode) {
      console.warn(`[n8n] [TEST MODE] Trigger skipped for event "${event}": No webhook URL configured.`);
    }
    return;
  }

  if (isTestMode) {
    console.log(`[n8n] [TEST MODE] Triggering event "${event}" to: ${url}`);
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

