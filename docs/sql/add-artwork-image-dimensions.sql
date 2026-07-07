-- artworks に画像のピクセル寸法を追加する（nullable・非破壊）。
-- 目的: 作品ギャラリーの段組（justified）レイアウトで、画像読み込み前にアスペクト比を確定させる。
-- 値は Cloudinary アップロード応答の width/height をクライアントが保存する。
-- 既存行のバックフィル: app/scripts/backfill-artwork-dimensions.mjs（SUPABASE_SERVICE_ROLE_KEY が必要）
-- 適用: Supabase SQL Editor で実行

alter table artworks add column if not exists image_width integer;
alter table artworks add column if not exists image_height integer;
