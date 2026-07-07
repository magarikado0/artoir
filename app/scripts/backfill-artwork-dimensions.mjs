#!/usr/bin/env node
/**
 * artworks.image_width / image_height のバックフィルスクリプト。
 *
 * 前提: docs/sql/add-artwork-image-dimensions.sql を Supabase SQL Editor で適用済みであること。
 * 対象: image_url があり image_width が null の行のみ（何度実行しても安全＝冪等）。
 * 寸法の取得: Cloudinary の fl_getinfo 変換（public アセットなら認証不要で JSON を返す）。
 *
 * 使い方（app/ ディレクトリで実行。service role キーはダッシュボードの API 設定から）:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/backfill-artwork-dimensions.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// 保存されている image_url は Cloudinary の secure_url
// （https://res.cloudinary.com/<cloud>/image/upload/v123/xxx.jpg）。
// `image/upload/` の直後に fl_getinfo を差し込むと、画像の代わりにメタ情報 JSON が返る。
const CLOUDINARY_UPLOAD_SEGMENT = /res\.cloudinary\.com\/[^/]+\/image\/upload\//

async function fetchDimensions(imageUrl) {
  if (!CLOUDINARY_UPLOAD_SEGMENT.test(imageUrl)) return null
  const infoUrl = imageUrl.replace('image/upload/', 'image/upload/fl_getinfo/')
  const res = await fetch(infoUrl)
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  const info = json?.input || json?.output
  if (!info || !(info.width > 0) || !(info.height > 0)) return null
  return { width: info.width, height: info.height }
}

async function main() {
  const { data: rows, error } = await supabase
    .from('artworks')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .is('image_width', null)
  if (error) {
    console.error('対象行の取得に失敗しました:', error.message)
    process.exit(1)
  }

  console.log(`対象: ${rows.length} 件（image_url あり・image_width が null）`)
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const [index, row] of rows.entries()) {
    const label = `[${index + 1}/${rows.length}] ${row.id}`
    try {
      const dims = await fetchDimensions(row.image_url)
      if (!dims) {
        skipped += 1
        console.warn(`${label} スキップ（Cloudinary URL でない、または寸法を取得できません）: ${row.image_url}`)
        continue
      }
      const { error: updateError } = await supabase
        .from('artworks')
        .update({ image_width: dims.width, image_height: dims.height })
        .eq('id', row.id)
      if (updateError) throw new Error(updateError.message)
      updated += 1
      console.log(`${label} 更新 ${dims.width}x${dims.height}`)
    } catch (err) {
      failed += 1
      console.error(`${label} 失敗: ${err.message}`)
    }
  }

  console.log(`完了: 更新 ${updated} / スキップ ${skipped} / 失敗 ${failed}`)
  if (failed > 0) process.exit(1)
}

main()
