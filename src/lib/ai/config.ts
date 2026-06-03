import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt, decrypt } from '@/lib/encryption';
import type { Database } from '@/types/database.types';

export type AiConfigRow = Database['public']['Tables']['ai_configs']['Row'];
export type AiConfigInsert = Database['public']['Tables']['ai_configs']['Insert'];
export type AiConfigUpdate = Database['public']['Tables']['ai_configs']['Update'];

export interface DecryptedAiConfig {
  id: string;
  provider: 'google' | 'llama' | 'deepseek';
  model_name: string;
  api_key: string | null;
  base_url: string | null;
  is_active: boolean;
  fallback_order: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all configurations from database.
 * Ordered by active status (true first), then fallback_order (ascending).
 */
export async function getDbAiConfigs(): Promise<DecryptedAiConfig[]> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn('[AI Config] Supabase admin client not available');
    return [];
  }

  const { data, error } = await admin
    .from('ai_configs')
    .select('*')
    .order('is_active', { ascending: false })
    .order('fallback_order', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[AI Config] Failed to fetch configurations:', error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => {
    let decryptedKey: string | null = null;
    if (row.api_key) {
      try {
        decryptedKey = decrypt(row.api_key);
      } catch (err) {
        console.error(`[AI Config] Failed to decrypt API key for config ${row.id}:`, err);
        decryptedKey = 'DECRYPTION_ERROR';
      }
    }

    return {
      id: row.id,
      provider: row.provider as 'google' | 'llama' | 'deepseek',
      model_name: row.model_name,
      api_key: decryptedKey,
      base_url: row.base_url,
      is_active: row.is_active,
      fallback_order: row.fallback_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

/**
 * Create or update an AI configuration.
 * Encrypts the api_key if provided.
 * If setting is_active to true, sets all other configurations' is_active to false.
 */
export async function saveAiConfig(
  config: Omit<AiConfigInsert, 'api_key'> & { api_key?: string | null }
): Promise<{ success: boolean; data?: AiConfigRow; error?: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { success: false, error: 'Supabase admin client not available' };
  }

  // Encrypt api_key if provided and not already encrypted
  let encryptedKey: string | null = null;
  if (config.api_key) {
    // If it's a placeholder, don't encrypt/update it, or if it is already encrypted (starts with iv format)
    const isEncrypted = config.api_key.split(':').length === 3;
    if (isEncrypted) {
      encryptedKey = config.api_key;
    } else {
      encryptedKey = encrypt(config.api_key);
    }
  }

  const payload: AiConfigInsert = {
    ...config,
    api_key: encryptedKey,
  };

  // If is_active is true, we must deactivate all other configurations first
  if (config.is_active) {
    const { error: deactivateError } = await admin
      .from('ai_configs')
      .update({ is_active: false })
      .neq('id', config.id || '00000000-0000-0000-0000-000000000000'); // exclude current if updating

    if (deactivateError) {
      console.error('[AI Config] Failed to deactivate other configurations:', deactivateError);
      return { success: false, error: 'Failed to update active statuses' };
    }
  }

  let result;
  if (config.id) {
    // Update
    result = await admin
      .from('ai_configs')
      .update(payload)
      .eq('id', config.id)
      .select()
      .single();
  } else {
    // Insert
    result = await admin
      .from('ai_configs')
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    console.error('[AI Config] Failed to save configuration:', result.error);
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.data };
}

/**
 * Delete an AI configuration.
 */
export async function deleteAiConfig(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { success: false, error: 'Supabase admin client not available' };
  }

  const { error } = await admin
    .from('ai_configs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[AI Config] Failed to delete configuration:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
