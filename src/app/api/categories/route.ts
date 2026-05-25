import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, description')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: (data ?? []) as CategoryRow[] });
}
