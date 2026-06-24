import { useMemo } from 'react'
import { layoutPhotoWall } from './photoWall'

/**
 * 写真ウォールのレイアウトをメモ化して返すフック。
 * photos / columns / options が変わらなければ再計算しない。
 * （options を渡す場合は呼び出し側でメモ化しておくと再計算を避けられる）
 *
 * @param {{id:string,width:number,height:number}[]} photos
 * @param {number} [columns=4] 列数
 * @param {object} [options] レイアウトエンジンの追加オプション（largeBase など）
 * @returns {{ items: {id:string,x:number,y:number,spanX:number,spanY:number}[], columns:number, rows:number }}
 */
export function usePhotoWallLayout(photos, columns = 4, options) {
  return useMemo(
    () => layoutPhotoWall(photos, { columns, ...(options || {}) }),
    [photos, columns, options],
  )
}
