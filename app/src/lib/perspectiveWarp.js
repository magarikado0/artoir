import { calculateDimensionsForMaxPixels } from './imageCompress'

// 四辺形（クアッド）を透視変換で長方形に補正するための軽量ユーティリティ。
// OpenCV.js のような重い依存は使わず、ホモグラフィ行列を自前で解き、
// WebGL シェーダで逆写像サンプリングして補正画像を生成する。
// WebGL が使えない環境では CPU（Canvas + per-pixel）にフォールバックする。
//
// クアッドの頂点順は常に [左上, 右上, 右下, 左下]（TL, TR, BR, BL）。

const DEFAULT_MAX_PIXELS = 12_000_000
const DEFAULT_QUALITY = 0.92
// 出力 1 辺の上限。WebGL のテクスチャ／ビューポート上限に収め、CPU 経路の負荷も抑える。
const MAX_OUTPUT_DIM = 4096

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * 出力サイズを辺の長さから算出する。
 * 幅 = 上辺と下辺の長い方、高さ = 左辺と右辺の長い方。
 * 極端に潰れた四辺形でも 0 にならないよう最小 1px を保証する。
 */
export function getQuadOutputSize(quad) {
  const [tl, tr, br, bl] = quad
  const width = Math.max(dist(tl, tr), dist(bl, br))
  const height = Math.max(dist(tl, bl), dist(tr, br))
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  }
}

/**
 * 自己交差（バタフライ）や潰れた四辺形を弾くための凸判定。
 * 4 頂点を順に巡り、すべての外積符号が一致すれば凸（＝単純で補正可能）。
 */
export function isConvexQuad(quad) {
  if (!quad || quad.length !== 4) return false
  let sign = 0
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i]
    const b = quad[(i + 1) % 4]
    const c = quad[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-6) return false // ほぼ一直線＝退化
    const s = cross > 0 ? 1 : -1
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

// 8x8 線形方程式 Ax = b を部分ピボット付きガウス消去で解く。
function solve8(A, b) {
  const n = 8
  const m = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col += 1) {
    let pivot = col
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    }
    if (Math.abs(m[pivot][col]) < 1e-12) throw new Error('射影変換の計算に失敗しました')
    if (pivot !== col) { const t = m[pivot]; m[pivot] = m[col]; m[col] = t }
    const pv = m[col][col]
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue
      const f = m[r][col] / pv
      if (f === 0) continue
      for (let c = col; c <= n; c += 1) m[r][c] -= f * m[col][c]
    }
  }
  const x = new Array(n)
  for (let i = 0; i < n; i += 1) x[i] = m[i][n] / m[i][i]
  return x
}

/**
 * 4 点対応からホモグラフィ（射影変換）行列を求める。
 * `from` を `to` に写す 3x3 を row-major（長さ 9, 末尾は 1）で返す。
 */
function computeHomography(from, to) {
  const A = []
  const b = []
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]); b.push(v)
  }
  const h = solve8(A, b)
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('画像の生成に失敗しました')); return }
      resolve(blob)
    }, mimeType, quality)
  })
}

const VERT_SRC = `
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// 出力ピクセル(vUV*uOut) をホモグラフィで元画像ピクセルへ逆写像し、
// テクスチャから（LINEAR の）バイリニア補間で取得する。
const FRAG_SRC = `
precision highp float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uOut;
uniform vec2 uSrc;
uniform vec3 uRow0;
uniform vec3 uRow1;
uniform vec3 uRow2;
void main() {
  vec3 p = vec3(vUV * uOut, 1.0);
  float sx = dot(uRow0, p);
  float sy = dot(uRow1, p);
  float sw = dot(uRow2, p);
  vec2 src = vec2(sx, sy) / sw;
  gl_FragColor = texture2D(uTex, src / uSrc);
}`

function compileShader(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'shader compile error')
  }
  return shader
}

function warpWebGL(source, srcW, srcH, quad, outW, outH) {
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true })
    || canvas.getContext('experimental-webgl')
  if (!gl) return null

  // テクスチャ上限を超える原画像は、上限に収まるよう縮小してからテクスチャ化する。
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  let texSource = source
  let sw = srcW
  let sh = srcH
  let srcQuad = quad
  if (srcW > maxTex || srcH > maxTex) {
    const f = maxTex / Math.max(srcW, srcH)
    sw = Math.max(1, Math.floor(srcW * f))
    sh = Math.max(1, Math.floor(srcH * f))
    const tmp = document.createElement('canvas')
    tmp.width = sw
    tmp.height = sh
    tmp.getContext('2d').drawImage(source, 0, 0, sw, sh)
    texSource = tmp
    srcQuad = quad.map((pt) => ({ x: pt.x * f, y: pt.y * f }))
  }

  const program = gl.createProgram()
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('WebGL program link failed')
  }
  gl.useProgram(program)

  // クリップ空間全面の三角形ストリップ。UV は上端を 0 にして出力の (0,0) を左上に合わせる。
  const verts = new Float32Array([
    -1, -1, 0, 1,
    1, -1, 1, 1,
    -1, 1, 0, 0,
    1, 1, 1, 0,
  ])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'aPos')
  const aUV = gl.getAttribLocation(program, 'aUV')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0)
  gl.enableVertexAttribArray(aUV)
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true) // テクスチャ v=0 を画像の上端に合わせる
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texSource)

  // 出力長方形の四隅 → 元画像クアッドへのホモグラフィ（逆写像用）。
  const outCorners = [{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }]
  const H = computeHomography(outCorners, srcQuad)

  gl.uniform1i(gl.getUniformLocation(program, 'uTex'), 0)
  gl.uniform2f(gl.getUniformLocation(program, 'uOut'), outW, outH)
  gl.uniform2f(gl.getUniformLocation(program, 'uSrc'), sw, sh)
  gl.uniform3f(gl.getUniformLocation(program, 'uRow0'), H[0], H[1], H[2])
  gl.uniform3f(gl.getUniformLocation(program, 'uRow1'), H[3], H[4], H[5])
  gl.uniform3f(gl.getUniformLocation(program, 'uRow2'), H[6], H[7], H[8])

  gl.viewport(0, 0, outW, outH)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  if (gl.getError() !== gl.NO_ERROR) return null
  return canvas
}

// WebGL 非対応時のフォールバック。出力ピクセルごとに逆写像してバイリニア補間する。
function warpCPU(source, srcW, srcH, quad, outW, outH) {
  const sc = document.createElement('canvas')
  sc.width = srcW
  sc.height = srcH
  const sctx = sc.getContext('2d')
  sctx.drawImage(source, 0, 0, srcW, srcH)
  const srcData = sctx.getImageData(0, 0, srcW, srcH).data

  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  const octx = out.getContext('2d')
  const outImg = octx.createImageData(outW, outH)
  const od = outImg.data

  const outCorners = [{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }]
  const H = computeHomography(outCorners, quad)

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const w = H[6] * x + H[7] * y + H[8]
      const sx = (H[0] * x + H[1] * y + H[2]) / w
      const sy = (H[3] * x + H[4] * y + H[5]) / w
      const x0 = clamp(Math.floor(sx), 0, srcW - 1)
      const y0 = clamp(Math.floor(sy), 0, srcH - 1)
      const x1 = Math.min(srcW - 1, x0 + 1)
      const y1 = Math.min(srcH - 1, y0 + 1)
      const fx = clamp(sx - x0, 0, 1)
      const fy = clamp(sy - y0, 0, 1)
      const di = (y * outW + x) * 4
      const i00 = (y0 * srcW + x0) * 4
      const i10 = (y0 * srcW + x1) * 4
      const i01 = (y1 * srcW + x0) * 4
      const i11 = (y1 * srcW + x1) * 4
      for (let c = 0; c < 4; c += 1) {
        const top = srcData[i00 + c] + (srcData[i10 + c] - srcData[i00 + c]) * fx
        const bot = srcData[i01 + c] + (srcData[i11 + c] - srcData[i01 + c]) * fx
        od[di + c] = top + (bot - top) * fy
      }
    }
  }
  octx.putImageData(outImg, 0, 0)
  return out
}

/**
 * 元画像（ImageBitmap / HTMLImageElement / Canvas）と四辺形から、
 * 透視補正した長方形画像を Blob で返す。確定時に原寸で呼ぶ想定。
 *
 * @param {object} source texImage2D / drawImage で使える画像ソース
 * @param {{x:number,y:number}[]} quad 元画像ピクセル座標の四隅 [TL, TR, BR, BL]
 */
export async function warpQuadToBlob(source, quad, options = {}) {
  const {
    mimeType = 'image/jpeg',
    maxPixels = DEFAULT_MAX_PIXELS,
    quality = DEFAULT_QUALITY,
  } = options

  const srcW = source.width || source.naturalWidth
  const srcH = source.height || source.naturalHeight
  if (!srcW || !srcH) throw new Error('画像サイズを取得できませんでした')
  if (!isConvexQuad(quad)) throw new Error('選択範囲が不正です（角が交差しています）')

  let { width: outW, height: outH } = getQuadOutputSize(quad)
  const scaled = calculateDimensionsForMaxPixels(outW, outH, maxPixels)
  outW = Math.max(1, scaled.width)
  outH = Math.max(1, scaled.height)
  const dimScale = Math.min(1, MAX_OUTPUT_DIM / Math.max(outW, outH))
  if (dimScale < 1) {
    outW = Math.max(1, Math.round(outW * dimScale))
    outH = Math.max(1, Math.round(outH * dimScale))
  }

  const targetMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  const quality_ = targetMime === 'image/jpeg' ? quality : undefined

  let canvas = null
  try {
    canvas = warpWebGL(source, srcW, srcH, quad, outW, outH)
  } catch {
    canvas = null
  }
  if (!canvas) canvas = warpCPU(source, srcW, srcH, quad, outW, outH)

  return canvasToBlob(canvas, targetMime, quality_)
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    image.src = url
  })
}

/**
 * EXIF の回転を反映した ImageBitmap を読み込む。
 * createImageBitmap の imageOrientation:'from-image' で向きを正規化し、
 * 表示・補正の両方で同じピクセル座標系を使えるようにする。
 * 非対応環境では HTMLImageElement にフォールバックする。
 */
export async function loadOrientedBitmap(url) {
  if (typeof createImageBitmap === 'function') {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const blob = await res.blob()
        try {
          return await createImageBitmap(blob, { imageOrientation: 'from-image' })
        } catch {
          return await createImageBitmap(blob)
        }
      }
    } catch {
      // fetch / createImageBitmap 不可 → 要素フォールバックへ
    }
  }
  return loadImageElement(url)
}
