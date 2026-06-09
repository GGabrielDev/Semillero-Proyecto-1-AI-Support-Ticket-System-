#!/usr/bin/env node
/**
 * Pre-startup environment checker.
 *
 * - Interactive mode (TTY): prompts the user for each missing required variable
 *   and appends the collected values to .env.local.
 * - Non-interactive mode (CI / Render / piped): prints warnings and exits 1 if
 *   any required variable is absent.
 *
 * Run automatically via the "dev" and "start" npm scripts.
 */

import { createInterface } from 'readline';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_LOCAL = resolve(ROOT, '.env.local');

// ─── Colour helpers ─────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};
const bold = (s) => `${c.bold}${s}${c.reset}`;
const red = (s) => `${c.red}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const green = (s) => `${c.green}${s}${c.reset}`;
const cyan = (s) => `${c.cyan}${s}${c.reset}`;
const dim = (s) => `${c.dim}${s}${c.reset}`;

// ─── Load .env.local into process.env (without dotenv dependency) ────────────
function loadEnvLocal() {
  if (!existsSync(ENV_LOCAL)) return {};
  const lines = readFileSync(ENV_LOCAL, 'utf8').split('\n');
  const parsed = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    parsed[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }
  return parsed;
}

// ─── Persist key=value lines to .env.local (upsert) ─────────────────────────
function persistToEnvLocal(entries) {
  if (entries.length === 0) return;
  let content = existsSync(ENV_LOCAL) ? readFileSync(ENV_LOCAL, 'utf8') : '';
  for (const [key, value] of entries) {
    const lines = content.split('\n').filter(
      (l) => !l.startsWith(`${key}=`) && !l.startsWith(`# ${key}`),
    );
    content = lines.join('\n');
    if (content.length > 0 && !content.endsWith('\n')) content += '\n';
    content += `${key}=${value}\n`;
  }
  writeFileSync(ENV_LOCAL, content, 'utf8');
}

// ─── Variable definitions ────────────────────────────────────────────────────
const REQUIRED = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Your Supabase project URL',
    hint: 'Found in: Supabase Dashboard → Project Settings → API → Project URL\n  Example: https://xxxxxxxxxxxx.supabase.co',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous (public) key',
    hint: 'Found in: Supabase Dashboard → Project Settings → API → anon / public key',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service-role key (server-only, keep secret)',
    hint:
      'Found in: Supabase Dashboard → Project Settings → API → service_role / secret key\n  ' +
      red('⚠  Never expose this key on the client side.'),
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    description: 'Public URL where the app is hosted',
    hint: 'Local development: http://localhost:3000\n  Production: https://your-app.onrender.com (or Vercel URL)',
    default: 'http://localhost:3000',
  },
  {
    key: 'AI_ENCRYPTION_KEY',
    description: 'Symmetric encryption key for database API keys (32-byte hex)',
    hint: 'Generate one using: openssl rand -hex 32\n  Required in production to encrypt secure credentials at rest.',
    optional: process.env.NODE_ENV !== 'production',
  },
  {
    key: 'N8N_SYSTEM_EMAIL',
    description: 'System user email for n8n automated actions',
    hint: 'This account will be created to author updates and comments induced by n8n.\n  Example: n8n-bot@yourdomain.com',
  },
  {
    key: 'N8N_SYSTEM_PASSWORD',
    description: 'Password for the n8n system user',
    hint: 'Managed password for the n8n bot account. Please use a secure string.',
  },
];

const AI_GROUP = [
  {
    key: 'AI_PROVIDER',
    description: 'AI backend to use: "llama" (local) or "google"',
    hint:
      'Use "llama" to route requests to a local llama-server, or "google" to use\n' +
      '  Google Generative AI (Gemini). The app will automatically fall back to\n' +
      '  "google" if the llama server is unreachable.',
    default: 'google',
    optional: true,
  },
  {
    key: 'LLAMA_SERVER_BASE_URL',
    description: 'Base URL of your local llama-server (required when AI_PROVIDER=llama)',
    hint:
      'Start llama-server locally, then expose it with:\n' +
      '    npx ngrok http 8080\n' +
      '  Paste the HTTPS forwarding URL here so Render can reach it.\n' +
      '  Example: https://xxxx-xx-xx.ngrok-free.app\n' +
      '  Leave blank to skip (Google AI will be used as fallback).',
    optional: true,
  },
  {
    key: 'LLAMA_MODEL',
    description: 'Model name sent to llama-server (e.g. llama3)',
    hint:
      'The model identifier passed to the OpenAI-compatible /v1/chat/completions\n' +
      '  endpoint. Defaults to "llama3" when not set.',
    optional: true,
    default: 'llama3',
  },
  {
    key: 'GOOGLE_GENERATIVE_AI_API_KEY',
    description: 'Google Generative AI (Gemini) API key',
    hint:
      'Obtain at: https://aistudio.google.com/app/apikey\n' +
      '  Required when AI_PROVIDER=google, or as fallback when llama is unreachable.\n' +
      '  ' +
      yellow('⚠  If not set, AI features will be disabled when llama is also unavailable.'),
    optional: true,
  },
];

const OPTIONAL_WARNED = [
  {
    key: 'N8N_WEBHOOK_URL',
    description: 'Outbound n8n webhook URL',
    hint: 'URL of the n8n webhook that receives ticket events. Leave empty to disable automations.',
  },
  {
    key: 'N8N_WEBHOOK_SECRET',
    description: 'Shared secret for inbound /api/webhooks/n8n requests',
    hint: 'Set the same value in n8n → Credentials → Header Auth.',
  },
  {
    key: 'CRON_SECRET',
    description: 'Bearer token for /api/cron/daily-summary',
    hint: 'Any random string. Set it in Render/Vercel Cron config or your external scheduler.',
  },
];

// ─── Readline prompt helper ───────────────────────────────────────────────────
async function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadEnvLocal();

  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const collected = [];
  let hasError = false;

  console.log('');
  console.log(bold('  🔍  AI Support Ticket System — Environment Check'));
  console.log(dim('  ─────────────────────────────────────────────────'));
  console.log('');

  // ── Check required vars ────────────────────────────────────────────────────
  const missingRequired = REQUIRED.filter((v) => !v.optional && !process.env[v.key]);

  if (missingRequired.length > 0) {
    if (isTTY) {
      console.log(yellow('  The following required variables are not set. Please enter them now.'));
      console.log(dim('  They will be saved to .env.local in this directory.\n'));

      const rl = createInterface({ input: process.stdin, output: process.stdout });

      for (const varDef of missingRequired) {
        console.log(`  ${bold(varDef.key)}`);
        console.log(`  ${varDef.description}`);
        console.log(`  ${dim(varDef.hint)}`);
        if (varDef.default) console.log(`  ${dim(`Default (press Enter): ${varDef.default}`)}`);
        const raw = await ask(rl, `  ${cyan('>')} `);
        const value = raw.trim() || varDef.default || '';
        collected.push([varDef.key, value]);
        process.env[varDef.key] = value;
        console.log('');
      }

      rl.close();
    } else {
      for (const varDef of missingRequired) {
        console.error(red(`  ✖  Missing required: ${bold(varDef.key)}`));
        console.error(`     ${varDef.description}`);
        console.error(`     ${dim(varDef.hint)}\n`);
      }
      hasError = true;
    }
  }

  // ── Check AI_PROVIDER (required, but has a default) ───────────────────────
  const missingAiBase = AI_GROUP.filter((v) => !v.optional && !process.env[v.key]);
  if (missingAiBase.length > 0) {
    if (isTTY) {
      console.log(yellow('  AI Provider configuration is incomplete.\n'));
      const rl = createInterface({ input: process.stdin, output: process.stdout });

      for (const varDef of missingAiBase) {
        console.log(`  ${bold(varDef.key)}`);
        console.log(`  ${varDef.description}`);
        console.log(`  ${dim(varDef.hint)}`);
        if (varDef.default) console.log(`  ${dim(`Default (press Enter): ${varDef.default}`)}`);
        const raw = await ask(rl, `  ${cyan('>')} `);
        const value = raw.trim() || varDef.default || '';
        collected.push([varDef.key, value]);
        process.env[varDef.key] = value;
        console.log('');
      }

      rl.close();
    } else {
      for (const varDef of missingAiBase) {
        console.error(red(`  ✖  Missing AI config: ${bold(varDef.key)}`));
        console.error(`     ${dim(varDef.hint)}\n`);
      }
      hasError = true;
    }
  }

  // ── Warn about optional AI vars ────────────────────────────────────────────
  const provider = process.env['AI_PROVIDER'] ?? 'google';

  if (provider === 'llama' && !process.env['LLAMA_SERVER_BASE_URL']) {
    console.log(yellow(`  ⚠   ${bold('LLAMA_SERVER_BASE_URL')} is not set but AI_PROVIDER=llama.`));
    console.log(`     The app will attempt to connect to http://localhost:8080 by default.`);
    console.log(`     ${dim('To expose your local llama-server to Render, run: npx ngrok http 8080')}`);
    console.log('');
  }

  if (!process.env['GOOGLE_GENERATIVE_AI_API_KEY']) {
    if (provider === 'google') {
      console.log(yellow(`  ⚠   ${bold('GOOGLE_GENERATIVE_AI_API_KEY')} is not set.`));
      console.log(`     AI features (analysis, suggestions) will not work.`);
      console.log(`     Get a free key at: ${cyan('https://aistudio.google.com/app/apikey')}`);
    } else {
      console.log(yellow(`  ⚠   ${bold('GOOGLE_GENERATIVE_AI_API_KEY')} is not set.`));
      console.log(`     This is the fallback provider when llama-server is unreachable.`);
      console.log(`     Without it, AI features will fail if llama becomes unavailable.`);
      console.log(`     Get a free key at: ${cyan('https://aistudio.google.com/app/apikey')}`);
    }
    console.log('');
  }

  // ── Warn about optional automation vars ───────────────────────────────────
  const missingOptional = OPTIONAL_WARNED.filter((v) => !process.env[v.key]);
  if (missingOptional.length > 0) {
    console.log(dim('  Optional variables not set (automations / cron will be skipped):'));
    for (const varDef of missingOptional) {
      console.log(dim(`   • ${varDef.key} — ${varDef.description}`));
    }
    console.log('');
  }

  // ── Persist collected values ───────────────────────────────────────────────
  if (collected.length > 0) {
    persistToEnvLocal(collected);
    console.log(green(`  ✔  Saved ${collected.length} variable(s) to .env.local`));
    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (hasError) {
    console.error(red('  Startup aborted: set the missing variables and try again.'));
    console.error(dim('  Copy .env.example → .env.local and fill in your values.\n'));
    process.exit(1);
  }

  console.log(green('  ✔  Environment looks good. Starting the application…'));
  console.log('');
}

main().catch((err) => {
  console.error(red('  setup-env failed unexpectedly:'), err);
  process.exit(1);
});
