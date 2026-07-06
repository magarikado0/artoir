import { supabase } from './supabase'

// favorites テーブルの target_type。docs/sql/add-favorites.sql と一致させること。
export const FAVORITE_TYPES = ['artwork', 'exhibition', 'organization', 'profile']

/**
 * ログイン中ユーザーの該当 type のお気に入り target_id を Set で返す。
 * RLS により自分の行のみが返る。未ログイン/未設定時は空 Set。
 */
export async function fetchFavoriteIds(targetType) {
  if (!supabase) return new Set()
  const { data, error } = await supabase
    .from('favorites')
    .select('target_id')
    .eq('target_type', targetType)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[favorites] fetch failed', error.message)
    return new Set()
  }
  return new Set((data || []).map((row) => row.target_id))
}

/** お気に入りを追加。profile_id は RLS の with check に合わせて呼び出し側から渡す。 */
export async function addFavorite(targetType, targetId, profileId) {
  if (!supabase) return
  const { error } = await supabase
    .from('favorites')
    .insert({ profile_id: profileId, target_type: targetType, target_id: targetId })
  // 二重押下による unique 違反は成功扱い（既にお気に入り済み）。
  if (error && error.code !== '23505') throw error
}

/** お気に入りを解除。 */
export async function removeFavorite(targetType, targetId) {
  if (!supabase) return
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('target_type', targetType)
    .eq('target_id', targetId)
  if (error) throw error
}
