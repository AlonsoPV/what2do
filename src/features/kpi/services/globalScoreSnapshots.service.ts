import { supabase } from '@/lib/supabase/client'
import type { GlobalScoreSnapshot } from '../types/kpi.types'

const TABLE = 'global_score_snapshots'

export type GlobalScoreSnapshotsOpts = {
  limit?: number
}

export type InsertGlobalScoreSnapshotInput = {
  score: number
  metadata?: Record<string, unknown> | null
}

/**
 * Snapshots del score global O2C (más reciente primero).
 */
export async function listGlobalScoreSnapshots(opts: GlobalScoreSnapshotsOpts = {}): Promise<GlobalScoreSnapshot[]> {
  const limit = opts.limit ?? 100
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as GlobalScoreSnapshot[]
}

/**
 * Inserta un snapshot del score global (0-1). Requiere permisos según RLS.
 */
export async function insertGlobalScoreSnapshot(
  input: InsertGlobalScoreSnapshotInput
): Promise<GlobalScoreSnapshot> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      score: input.score,
      metadata: input.metadata ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as GlobalScoreSnapshot
}
