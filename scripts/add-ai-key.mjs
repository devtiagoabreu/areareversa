#!/usr/bin/env node
/**
 * Registra (ou atualiza) uma chave de API de IA no banco, criptografada com
 * AES-256-GCM usando AI_KEY_MASTER_KEY — o mesmo formato lido por
 * src/lib/ai/encryption.ts (iv:ciphertext:authTag).
 *
 * Uso:
 *   node scripts/add-ai-key.mjs --name "Gemini blog" --provider GOOGLE \
 *     --model gemini-3.5-flash-lite --key-env GEMINI_API_KEY \
 *     --limit 1000000 --priority 1
 *
 * A chave NUNCA é impressa. Por padrão ela vem de uma variável de ambiente
 * (--key-env); --key existe para uso pontual e fica no histórico do shell.
 */

import crypto from 'node:crypto';
import pg from 'pg';

try {
  process.loadEnvFile('.env');
} catch {
  // .env opcional (em CI as variáveis já vêm do ambiente)
}

const DEFAULTS = {
  OPENAI: { keyEnv: 'OPENAI_API_KEY', model: 'gpt-4o' },
  ANTHROPIC: { keyEnv: 'ANTHROPIC_API_KEY', model: 'claude-3-5-sonnet-20241022' },
  GOOGLE: { keyEnv: 'GEMINI_API_KEY', model: 'gemini-3.5-flash-lite' },
  GROQ: { keyEnv: 'GROQ_API_KEY', model: 'llama-3.1-70b-versatile' },
  DEEPSEEK: { keyEnv: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
  CUSTOM: { keyEnv: 'CUSTOM_API_KEY', model: 'gpt-4o' },
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[name] = next;
      i++;
    } else {
      out[name] = true;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const provider = String(args.provider ?? 'GOOGLE').toUpperCase();
const defaults = DEFAULTS[provider];
if (!defaults) {
  console.error(`Provider inválido: ${provider}. Use: ${Object.keys(DEFAULTS).join(', ')}`);
  process.exit(1);
}

const name = String(args.name ?? `${provider} - principal`);
const model = String(args.model ?? defaults.model);
const monthlyTokenLimit = Number(args.limit ?? 1_000_000);
const priority = Number(args.priority ?? 1);
const baseUrl = args['base-url'] ? String(args['base-url']) : null;
const notes = args.notes ? String(args.notes) : null;

const keyEnv = String(args['key-env'] ?? defaults.keyEnv);
const apiKey = args.key ? String(args.key) : process.env[keyEnv];

if (!apiKey) {
  console.error(`Chave não encontrada: defina ${keyEnv} no .env ou passe --key.`);
  process.exit(1);
}

const masterHex = process.env.AI_KEY_MASTER_KEY;
if (!masterHex) {
  console.error('AI_KEY_MASTER_KEY não definida.');
  process.exit(1);
}
const masterKey = Buffer.from(masterHex, 'hex');
if (masterKey.length !== 32) {
  console.error('AI_KEY_MASTER_KEY deve ter 32 bytes (64 caracteres hex).');
  process.exit(1);
}

// Mesmo formato de src/lib/ai/encryption.ts
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();
const apiKeyEncrypted = `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;

// Prisma gera o id (cuid) no cliente; em SQL puro precisamos fornecer um.
const newId = `c${Date.now().toString(36)}${crypto.randomBytes(8).toString('hex')}`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const existing = await client.query('SELECT id, name FROM ai_keys WHERE name = $1 LIMIT 1', [name]);

  let id;
  if (existing.rowCount > 0) {
    id = existing.rows[0].id;
    await client.query(
      `UPDATE ai_keys
          SET provider = $2,
              api_key_encrypted = $3,
              model = $4,
              "baseUrl" = $5,
              priority = $6,
              monthly_token_limit = $7,
              status = 'ACTIVE',
              error_count = 0,
              notes = $8,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [id, provider, apiKeyEncrypted, model, baseUrl, priority, monthlyTokenLimit, notes]
    );
    console.log(`atualizada: ${name} (${id})`);
  } else {
    id = newId;
    await client.query(
      `INSERT INTO ai_keys
         (id, name, provider, api_key_encrypted, model, "baseUrl", priority,
          monthly_token_limit, current_month_used, total_lifetime_used, status,
          error_count, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 'ACTIVE', 0, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, name, provider, apiKeyEncrypted, model, baseUrl, priority, monthlyTokenLimit, notes]
    );
    console.log(`criada: ${name} (${id})`);
  }

  console.log(`  provider: ${provider}`);
  console.log(`  modelo:   ${model}`);
  console.log(`  limite:   ${monthlyTokenLimit} tokens/mês`);
  console.log(`  origem:   ${args.key ? '--key (argumento)' : `env ${keyEnv}`}`);
} finally {
  await client.end();
}
