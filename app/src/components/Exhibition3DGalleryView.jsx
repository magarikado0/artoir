import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getGalleryThumbnailUrl, getModalImageUrl } from "../lib/imageUrl";
import "./Exhibition3DGalleryView.css";

const ROOM_WIDTH = 3000;
const ROOM_DEPTH = 3000;
const ROOM_HEIGHT = 2000; // Taller walls reduce the visible floor/ceiling area
const FLOOR_Y = 200;
const CEILING_Y = FLOOR_Y - ROOM_HEIGHT;
const WALL_CENTER_Y = (FLOOR_Y + CEILING_Y) / 2;
const MARKER_FLOOR_Y = FLOOR_Y - 2;

const WALLS = ["front", "left", "right", "back"];

// How many artworks should comfortably fit in view from a single standing spot.
const ARTWORKS_PER_VIEWPOINT = 3;

// Frame sizing: the base max outer box a frame can grow to.
const FRAME_MAX_W = 360;
const FRAME_MAX_H = 400;
const FRAME_MIN_W = 140;
// CSS frame chrome: 15px border + 20px matte padding on both sides.
// The JS sizing keeps the *inner image area* at the artwork aspect ratio, then
// adds this chrome so portrait works do not get excessive top/bottom whitespace.
const FRAME_CHROME = (15+ 20) * 2;
// Constant edge-to-edge gap between neighboring frames.
const FRAME_EDGE_GAP = 90;
// Keep the group of artworks comfortably inside the wall, away from the corners.
const MAX_WALL_SPAN = ROOM_WIDTH - 300;

// Fit the artwork image area to the artwork's own aspect ratio, then add the
// frame chrome. This avoids the common portrait-work problem where a border-box
// frame has the correct outer aspect ratio but its inner image area does not,
// creating excessive top/bottom whitespace.
function fitFrameToArtworkBox(
  ar,
  maxOuterW = FRAME_MAX_W,
  maxOuterH = FRAME_MAX_H,
) {
  const safeAr = ar > 0 ? ar : 0.8;
  const innerMaxW = Math.max(40, maxOuterW - FRAME_CHROME);
  const innerMaxH = Math.max(40, maxOuterH - FRAME_CHROME);
  let innerW;
  let innerH;

  if (safeAr >= innerMaxW / innerMaxH) {
    innerW = innerMaxW;
    innerH = innerMaxW / safeAr;
  } else {
    innerW = innerMaxH * safeAr;
    innerH = innerMaxH;
  }

  return { w: innerW + FRAME_CHROME, h: innerH + FRAME_CHROME };
}

// Calculate painting positions on a specific wall. Adjacent frames are laid out
// by their actual outer frame widths, with a constant edge-to-edge gap. This is
// different from equal center spacing: narrow portrait works and wide landscape
// works still maintain the same visible distance between their frame edges.
function getPositionsForWall(list, wallName, aspects = {}) {
  if (list.length === 0) return [];
  const count = list.length;
  const baseFrames = list.map((item) => {
    const ar = aspects[item.id] ?? 0.8;
    const frame = fitFrameToArtworkBox(ar, FRAME_MAX_W, FRAME_MAX_H);
    return { item, ar, ...frame };
  });

  const baseWidthTotal = baseFrames.reduce((sum, frame) => sum + frame.w, 0);
  const availableForFrames =
    MAX_WALL_SPAN - FRAME_EDGE_GAP * Math.max(0, count - 1);
  const scale = Math.min(1, availableForFrames / Math.max(baseWidthTotal, 1));
  const maxOuterW = Math.max(FRAME_MIN_W, FRAME_MAX_W * scale);
  const maxOuterH = Math.max(FRAME_MIN_W, FRAME_MAX_H * scale);
  const frames = baseFrames.map(({ item, ar }) => ({
    item,
    ...fitFrameToArtworkBox(ar, maxOuterW, maxOuterH),
  }));
  const frameWidthTotal = frames.reduce((sum, frame) => sum + frame.w, 0);
  const gap =
    count > 1
      ? Math.max(
          30,
          Math.min(
            FRAME_EDGE_GAP,
            (MAX_WALL_SPAN - frameWidthTotal) / (count - 1),
          ),
        )
      : 0;
  const totalSpan = frameWidthTotal + gap * Math.max(0, count - 1);
  let cursor = -totalSpan / 2;

  return frames.map(({ item, w, h }) => {
    const offset = cursor + w / 2;
    cursor += w + gap;
    let x = 0;
    let y = -110; // Raised above eye-level, aligned along a common hanging line for a neat, gallery-style row
    let z = 0;
    let ry = 0;

    // Clearance from the wall surface. Needs to comfortably exceed the hover
    // pop-forward distance (see CSS) so the frame never clips behind the wall.
    const wallClearance = 40;

    if (wallName === "front") {
      x = offset;
      z = -(ROOM_DEPTH / 2 - wallClearance);
      ry = 0;
    } else if (wallName === "back") {
      x = -offset;
      z = ROOM_DEPTH / 2 - wallClearance;
      ry = 180;
    } else if (wallName === "left") {
      x = -(ROOM_WIDTH / 2 - wallClearance);
      z = -offset;
      ry = 90;
    } else if (wallName === "right") {
      x = ROOM_WIDTH / 2 - wallClearance;
      z = offset;
      ry = -90;
    }

    return { ...item, x, y, z, ry, frameW: w, frameH: h, frameGap: gap };
  });
}

function getFacingRotationForPoint(x, z) {
  const distances = [
    { ry: 0, distance: z + ROOM_DEPTH / 2 },
    { ry: 180, distance: ROOM_DEPTH / 2 - z },
    { ry: 90, distance: x + ROOM_WIDTH / 2 },
    { ry: -90, distance: ROOM_WIDTH / 2 - x },
  ];
  return distances.reduce((nearest, current) =>
    current.distance < nearest.distance ? current : nearest,
  ).ry;
}

function getGridViewpoints(artworkCount) {
  const count = Math.max(1, Math.ceil(artworkCount / ARTWORKS_PER_VIEWPOINT));
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const xRange = ROOM_WIDTH - 1300;
  const zRange = ROOM_DEPTH - 1300;

  return Array.from({ length: count }, (_, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = cols === 1 ? 0 : -xRange / 2 + (xRange * col) / (cols - 1);
    const z = rows === 1 ? 0 : -zRange / 2 + (zRange * row) / (rows - 1);

    return {
      id: `stand-${idx}`,
      name: `立ち位置 ${idx + 1}`,
      x,
      y: 0,
      z,
      rx: 0,
      ry: getFacingRotationForPoint(x, z),
      markerX: x,
      markerZ: z,
    };
  });
}

export default function Exhibition3DGalleryView({
  artworks,
  onClose,
  onOpenArtwork,
}) {
  const items = useMemo(() => artworks.filter((a) => a.image_url), [artworks]);
  const [aspects, setAspects] = useState({});

  // Compute camera state tracking
  const cameraRef = useRef({ x: 0, y: 0, z: 1050, rx: 0, ry: 0 });
  const rigRef = useRef(null);
  const roomRef = useRef(null);
  const isAnimatingRef = useRef(false);

  const [, setAnimating] = useState(false);
  const [currentViewPoint, setCurrentViewPoint] = useState("stand-0");

  // Track the real viewport size so standing distances can be computed from the
  // actual horizontal field of view, not just a rough guess.
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // FOV ~50 deg approx: perspective = H * 1.07
  const perspective = Math.max(800, Math.round(viewportSize.height * 1.07));

  // Track image aspect ratios for dynamic framing sizes
  useEffect(() => {
    let cancelled = false;
    items.forEach((artwork) => {
      const url = getGalleryThumbnailUrl(artwork.image_url);
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        if (!img.naturalWidth || !img.naturalHeight) return;
        const ar = img.naturalWidth / img.naturalHeight;
        setAspects((prev) =>
          prev[artwork.id] ? prev : { ...prev, [artwork.id]: ar },
        );
      };
      img.src = url;
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  // Distribute artworks across 4 walls and position them on each
  const paintingsByWall = useMemo(() => {
    const distributed = items.map((item, idx) => ({
      ...item,
      wall: WALLS[idx % 4],
    }));
    const map = {};
    WALLS.forEach((wallName) => {
      map[wallName] = getPositionsForWall(
        distributed.filter((p) => p.wall === wallName),
        wallName,
        aspects,
      );
    });
    return map;
  }, [items, aspects]);

  const paintings = useMemo(
    () => WALLS.flatMap((wallName) => paintingsByWall[wallName]),
    [paintingsByWall],
  );

  // Roughly one standing spot per three artworks, distributed evenly through the room.
  const viewpoints = useMemo(
    () => getGridViewpoints(items.length),
    [items.length],
  );

  // Camera transition tween handler
  const transitionCamera = useCallback(
    (targetX, targetY, targetZ, targetRx, targetRy, callback) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      setAnimating(true);

      // Normalize targetRy so it doesn't spin wildly
      let diffRy = targetRy - cameraRef.current.ry;
      diffRy = ((diffRy + 180) % 360) - 180;
      if (diffRy < -180) diffRy += 360;
      targetRy = cameraRef.current.ry + diffRy;

      cameraRef.current = {
        x: targetX,
        y: targetY,
        z: targetZ,
        rx: targetRx,
        ry: targetRy,
      };

      if (rigRef.current && roomRef.current) {
        rigRef.current.style.transition =
          "transform 0.9s cubic-bezier(0.25, 1, 0.5, 1)";
        roomRef.current.style.transition =
          "transform 0.9s cubic-bezier(0.25, 1, 0.5, 1)";

        rigRef.current.style.transform = `translate3d(${-targetX}px, ${-targetY}px, ${-targetZ}px)`;
        roomRef.current.style.transform = `rotateX(${targetRx}deg) rotateY(${targetRy}deg)`;
      }

      setTimeout(() => {
        if (rigRef.current && roomRef.current) {
          rigRef.current.style.transition = "none";
          roomRef.current.style.transition = "none";
        }
        isAnimatingRef.current = false;
        setAnimating(false);
        if (callback) callback();
      }, 900);
    },
    [],
  );

  // Viewpoint movement trigger
  const goToViewPoint = useCallback(
    (vp) => {
      setCurrentViewPoint(vp.id);
      transitionCamera(vp.x, vp.y, vp.z, vp.rx, vp.ry);
    },
    [transitionCamera],
  );

  // Drag controls to look around (yaw & pitch) while standing at a viewpoint
  const pointerDownRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    if (
      e.target.closest(
        "button, a, .ui-gallery3d-marker, .ui-gallery3d-artwork-frame",
      )
    )
      return;
    pointerDownRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!pointerDownRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.16;
    cameraRef.current.ry = (cameraRef.current.ry - dx * sensitivity) % 360;
    cameraRef.current.rx = Math.max(
      -40,
      Math.min(40, cameraRef.current.rx + dy * sensitivity),
    );

    // Break pre-defined viewpoint match on drag since user looked away
    setCurrentViewPoint(null);

    if (rigRef.current && roomRef.current && !isAnimatingRef.current) {
      rigRef.current.style.transform = `translate3d(${-cameraRef.current.x}px, ${-cameraRef.current.y}px, ${-cameraRef.current.z}px)`;
      roomRef.current.style.transform = `rotateX(${cameraRef.current.rx}deg) rotateY(${cameraRef.current.ry}deg)`;
    }
  }, []);

  const onPointerUp = useCallback((e) => {
    pointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer capture may already be released */
    }
  }, []);

  // Escape closes the 3D view. Movement is entirely click-to-teleport via the
  // floor markers below, so no keyboard/D-pad walking controls are needed.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Setup initial viewport position and freeze body scroll
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Set starting position at the first room stand.
    const initialViewpoint = getGridViewpoints(items.length)[0];
    cameraRef.current = {
      x: initialViewpoint.x,
      y: initialViewpoint.y,
      z: initialViewpoint.z,
      rx: initialViewpoint.rx,
      ry: initialViewpoint.ry,
    };

    if (rigRef.current && roomRef.current) {
      rigRef.current.style.transform = `translate3d(${-initialViewpoint.x}px, ${-initialViewpoint.y}px, ${-initialViewpoint.z}px)`;
      roomRef.current.style.transform = `rotateX(${initialViewpoint.rx}deg) rotateY(${initialViewpoint.ry}deg)`;
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [items.length]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="3Dアートギャラリー"
      className="ui-gallery3d-overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="ui-gallery3d-viewport"
        style={{ perspective: `${perspective}px` }}
      >
        {/* Camera Stage */}
        <div ref={rigRef} className="ui-gallery3d-camera-rig">
          <div ref={roomRef} className="ui-gallery3d-room">
            {/* Floor */}
            <div
              className="ui-gallery3d-floor"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_DEPTH,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_DEPTH / 2,
                transform: `translateY(${FLOOR_Y}px) rotateX(90deg)`,
              }}
            />

            {/* Ceiling */}
            <div
              className="ui-gallery3d-ceiling"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_DEPTH,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_DEPTH / 2,
                transform: `translateY(${CEILING_Y}px) rotateX(-90deg)`,
              }}
            />

            {/* Front Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_HEIGHT,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(0, ${WALL_CENTER_Y}px, ${-ROOM_DEPTH / 2}px)`,
              }}
            />

            {/* Back Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_WIDTH,
                height: ROOM_HEIGHT,
                left: -ROOM_WIDTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(0, ${WALL_CENTER_Y}px, ${ROOM_DEPTH / 2}px) rotateY(180deg)`,
              }}
            />

            {/* Left Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_DEPTH,
                height: ROOM_HEIGHT,
                left: -ROOM_DEPTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(${-ROOM_WIDTH / 2}px, ${WALL_CENTER_Y}px, 0) rotateY(90deg)`,
              }}
            />

            {/* Right Wall */}
            <div
              className="ui-gallery3d-wall"
              style={{
                width: ROOM_DEPTH,
                height: ROOM_HEIGHT,
                left: -ROOM_DEPTH / 2,
                top: -ROOM_HEIGHT / 2,
                transform: `translate3d(${ROOM_WIDTH / 2}px, ${WALL_CENTER_Y}px, 0) rotateY(-90deg)`,
              }}
            />

            {/* Interactive Viewpoint Markers on Floor */}
            {viewpoints.map((vp) => {
              const isActive = currentViewPoint === vp.id;
              return (
                <button
                  key={vp.id}
                  type="button"
                  className={`ui-gallery3d-marker ${isActive ? "is-active" : ""}`}
                  style={{
                    left: vp.markerX,
                    top: vp.markerZ,
                    transform: `translate(-50%, -50%) translateY(${MARKER_FLOOR_Y}px) rotateX(90deg)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToViewPoint(vp);
                  }}
                  aria-label={`${vp.name}に移動`}
                  title={vp.name}
                >
                  <div className="ui-gallery3d-marker-inner" />
                </button>
              );
            })}

            {/* Artworks */}
            {paintings.map((painting) => {
              const src = getModalImageUrl(painting.image_url);
              const thumb = getGalleryThumbnailUrl(painting.image_url);
              const visibleCreators = (painting.creators || []).filter(
                (c) => c.profile?.display_name,
              );
              const creatorName =
                visibleCreators.length > 0
                  ? visibleCreators[0].profile.display_name
                  : null;
              const w = painting.frameW;
              const h = painting.frameH;
              const plaqueWidth = Math.max(FRAME_MIN_W, Math.min(w, 280));

              // A single flat element per artwork (no extra nested 3D wrapper levels),
              // matching how the room's walls/floor/ceiling are built. The centering
              // (`translate(-50%, -50%)`) is baked into the same transform string, and
              // works correctly because it runs *after* the rotateY in the transform
              // chain, so it always centers the frame on its own local axes.
              return (
                <div
                  key={painting.id}
                  className="ui-gallery3d-artwork-frame"
                  style={{
                    width: w,
                    height: h,
                    transform: `translate3d(${painting.x}px, ${painting.y}px, ${painting.z}px) rotateY(${painting.ry}deg) translate(-50%, -50%)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenArtwork?.(painting);
                  }}
                >
                  <img
                    src={src}
                    alt={painting.title || "作品"}
                    className="ui-gallery3d-img"
                    onError={(e) => {
                      e.target.src = thumb;
                    }}
                  />

                  {/* Plaque, anchored to the frame's own bottom edge (top: 100%) so it never
                      shifts the frame's position, and capped to the frame's own slot width
                      so it can't overlap a neighboring artwork either. */}
                  <div
                    className="ui-gallery3d-plaque"
                    style={{ width: plaqueWidth }}
                  >
                    <div className="ui-gallery3d-plaque-title">
                      {painting.title || "無題"}
                    </div>
                    {creatorName && (
                      <div className="ui-gallery3d-plaque-creator">
                        @{creatorName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HUD Controls Overlay */}
        <div className="ui-gallery3d-controls-overlay">
          {/* Top Bar */}
          <div className="ui-gallery3d-topbar">
            <div className="ui-gallery3d-title-info">
              <h3>3D空間を巡る</h3>
            </div>
            <button
              type="button"
              className="ui-gallery3d-close-btn"
              onClick={onClose}
              aria-label="3Dビューを閉じる"
            >
              ×
            </button>
          </div>

          {/* Minimal Temporary Instructions */}
          <div className="ui-gallery3d-instructions">
            床のマーカーをクリックして立ち位置を移動
            <br />
            絵画をクリック：作品詳細を見る
          </div>
        </div>
      </div>
    </div>
  );
}
