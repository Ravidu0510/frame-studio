"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_SIZE = 1080;
const FRAME_SRC = "/frame.png";
const EVENT_NAME = "AI Capacity Building";
const CAPTION = "I'm at AI Capacity Building with CompSoc26 today! #CompSoc26";
// Keep the photo inside the opening, including its rounded corners.
const PHOTO_AREA = { x: 48, y: 92, width: 984, height: 860, radius: 58 };

type Pan = { x: number; y: number };

function clampPan(pan: Pan, drawW: number, drawH: number): Pan {
  const minX = PHOTO_AREA.x + PHOTO_AREA.width - drawW;
  const minY = PHOTO_AREA.y + PHOTO_AREA.height - drawH;
  return {
    x: Math.min(PHOTO_AREA.x, Math.max(minX, pan.x)),
    y: Math.min(PHOTO_AREA.y, Math.max(minY, pan.y)),
  };
}

function getPositionPercent(value: number, minimum: number, maximum: number) {
  if (maximum === minimum) return 50;
  return ((value - minimum) / (maximum - minimum)) * 100;
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);

  const [frameReady, setFrameReady] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [caption, setCaption] = useState(CAPTION);
  const dragStart = useRef<{ x: number; y: number; pan: Pan } | null>(null);

  // Preload the frame once.
  useEffect(() => {
    const frame = new Image();
    frame.onload = () => {
      frameRef.current = frame;
      setFrameReady(true);
    };
    frame.src = FRAME_SRC;
  }, []);

  useEffect(() => {
    setShareSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function",
    );
  }, []);

  useEffect(() => {
    fetch("/bioCaption.txt")
      .then((response) => (response.ok ? response.text() : Promise.reject()))
      .then((text) => setCaption(text.trim()))
      .catch(() => setCaption(CAPTION));
  }, []);

  const baseScale = useCallback((iw: number, ih: number) => {
    return Math.max(PHOTO_AREA.width / iw, PHOTO_AREA.height / ih);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#070916";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const img = imgRef.current;
    if (img) {
      const scale = baseScale(img.naturalWidth, img.naturalHeight) * zoom;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(
        PHOTO_AREA.x,
        PHOTO_AREA.y,
        PHOTO_AREA.width,
        PHOTO_AREA.height,
        PHOTO_AREA.radius,
      );
      ctx.clip();
      ctx.drawImage(img, pan.x, pan.y, drawW, drawH);
      ctx.restore();
    }

    const frame = frameRef.current;
    if (frame) {
      ctx.drawImage(frame, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }, [baseScale, pan, zoom]);

  useEffect(() => {
    draw();
  }, [draw, frameReady]);

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          imgRef.current = img;
          const scale = baseScale(img.naturalWidth, img.naturalHeight);
          const drawW = img.naturalWidth * scale;
          const drawH = img.naturalHeight * scale;
          setZoom(1);
          setPan({
            x: PHOTO_AREA.x + (PHOTO_AREA.width - drawW) / 2,
            y: PHOTO_AREA.y + (PHOTO_AREA.height - drawH) / 2,
          });
          setHasPhoto(true);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [baseScale],
  );

  const onZoomChange = (value: number) => {
    const img = imgRef.current;
    setZoom(value);
    if (!img) return;
    const scale = baseScale(img.naturalWidth, img.naturalHeight) * value;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    setPan((prev) => clampPan(prev, drawW, drawH));
  };

  const onPositionChange = (axis: "x" | "y", value: number) => {
    const img = imgRef.current;
    if (!img) return;
    const scale = baseScale(img.naturalWidth, img.naturalHeight) * zoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const minimum =
      axis === "x"
        ? PHOTO_AREA.x + PHOTO_AREA.width - drawW
        : PHOTO_AREA.y + PHOTO_AREA.height - drawH;
    const maximum = axis === "x" ? PHOTO_AREA.x : PHOTO_AREA.y;
    const position = minimum + (maximum - minimum) * (value / 100);
    setPan((prev) =>
      clampPan(
        axis === "x" ? { x: position, y: prev.y } : { x: prev.x, y: position },
        drawW,
        drawH,
      ),
    );
  };

  const getAxisPosition = (axis: "x" | "y") => {
    const img = imgRef.current;
    if (!img) return 50;
    const scale = baseScale(img.naturalWidth, img.naturalHeight) * zoom;
    const size =
      axis === "x" ? img.naturalWidth * scale : img.naturalHeight * scale;
    const areaStart = axis === "x" ? PHOTO_AREA.x : PHOTO_AREA.y;
    const areaSize = axis === "x" ? PHOTO_AREA.width : PHOTO_AREA.height;
    const current = axis === "x" ? pan.x : pan.y;
    return getPositionPercent(current, areaStart + areaSize - size, areaStart);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasPhoto) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, pan };
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = CANVAS_SIZE / rect.width;
    const dx = (e.clientX - dragStart.current.x) * scaleFactor;
    const dy = (e.clientY - dragStart.current.y) * scaleFactor;
    const img = imgRef.current;
    const scale = baseScale(img.naturalWidth, img.naturalHeight) * zoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    setPan(
      clampPan(
        { x: dragStart.current.pan.x + dx, y: dragStart.current.pan.y + dy },
        drawW,
        drawH,
      ),
    );
  };

  const onPointerUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const getBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), "image/png", 1);
    });

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-frame.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], "event-frame.png", { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: EVENT_NAME,
          text: caption,
        });
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to download
    }
    handleDownload();
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore silently
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="hero mx-auto max-w-6xl px-6 pt-8 pb-14 md:pt-10 md:pb-20">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <div className="flex items-center gap-3">
            <img
              src="/compsoc-logo.png"
              alt="CompSoc University of Jaffna logo"
              className="brand-logo"
            />
            <span className="font-mono text-xs font-medium tracking-[0.2em] text-paper/75 uppercase md:text-sm">
              CompSoc26
            </span>
          </div>
          <a
            href="https://csc.jfn.ac.lk"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] tracking-[0.16em] text-teal uppercase transition-colors hover:text-paper md:text-xs"
          >
            Department of Computer Science
          </a>
        </header>

        <div className="grid items-center gap-12 pt-14 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:pt-20">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-teal uppercase">
              {EVENT_NAME} · Official Photo Frame
            </p>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[0.98] tracking-tight text-paper md:text-7xl">
              Get Your Official
              <br />
              <span className="text-violet">CompSoc Frame.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-paper/70 md:text-lg">
              Upload your photo, align it inside our official event frame, and
              share on LinkedIn.
            </p>
          </div>
          <div className="hero-preview">
            <img src="/frame.png" alt="CompSoc event frame preview" />
            <span className="preview-label">OFFICIAL FRAME / 01</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="hairline" />
      </div>

      {/* Studio */}
      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="mb-10 max-w-xl">
          <p className="font-mono text-xs tracking-[0.2em] text-teal uppercase">
            Image Generator
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-paper md:text-4xl">
            Build your official event image.
          </h2>
          <p className="mt-3 text-paper/60">
            Add your photo, position it inside the CompSoc frame, then export a
            post-ready image.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 md:gap-16">
          {/* Step rail */}
          <div className="flex md:flex-col gap-6 md:gap-10">
            <Step
              n="01"
              label="Upload"
              active={!hasPhoto}
              done={hasPhoto}
              desc="Choose a clear, front-facing photo. Square images work best."
            />
            <Step
              n="02"
              label="Adjust"
              active={hasPhoto}
              done={false}
              desc="Drag to reposition, use the slider to zoom until you fit the frame."
            />
            <Step
              n="03"
              label="Share"
              active={false}
              done={false}
              desc="Download the card, or share it straight to your apps."
            />
          </div>

          {/* Canvas + controls */}
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`relative mx-auto w-full max-w-[480px] aspect-square rounded-2xl checker card-shadow overflow-hidden transition-all ${
                dragOver ? "ring-2 ring-teal" : ""
              }`}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                className={`w-full h-full touch-none ${
                  hasPhoto ? "cursor-grab active:cursor-grabbing" : ""
                }`}
              />

              {!hasPhoto && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8 group"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-ink2/80 text-amber group-hover:border-amber transition-colors">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        d="M12 16V4M12 4l-5 5M12 4l5 5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="font-medium text-paper">
                    Drop a photo here or tap to browse
                  </span>
                  <span className="text-sm text-paper/50">
                    JPG or PNG, up to ~15MB
                  </span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = "";
              }}
            />

            {hasPhoto && (
              <div className="mx-auto mt-6 max-w-[480px] space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-paper/50 mb-2">
                    <span>ZOOM</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={2.5}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                    className="w-full accent-amber"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-xs font-mono text-paper/50">
                      <span>HORIZONTAL POSITION</span>
                      <span>{Math.round(getAxisPosition("x"))}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={getAxisPosition("x")}
                      onChange={(e) =>
                        onPositionChange("x", Number(e.target.value))
                      }
                      aria-label="Horizontal image position"
                      className="w-full accent-teal"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-xs font-mono text-paper/50">
                      <span>VERTICAL POSITION</span>
                      <span>{Math.round(getAxisPosition("y"))}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={getAxisPosition("y")}
                      onChange={(e) =>
                        onPositionChange("y", Number(e.target.value))
                      }
                      aria-label="Vertical image position"
                      className="w-full accent-teal"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-paper/80 hover:border-paper/40 hover:text-paper transition-colors"
                  >
                    Choose different photo
                  </button>
                  <button
                    onClick={handleDownload}
                    className="rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-ink hover:brightness-110 transition"
                  >
                    Download image
                  </button>
                  <button
                    onClick={handleShare}
                    className="rounded-full border border-teal px-5 py-2.5 text-sm font-semibold text-teal hover:bg-teal hover:text-ink transition-colors"
                  >
                    {shareSupported ? "Share…" : "Share (downloads card)"}
                  </button>
                  <button
                    onClick={handleCopyCaption}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-paper/80 hover:border-paper/40 hover:text-paper transition-colors"
                  >
                    {copied ? "Caption copied ✓" : "Copy LinkedIn caption"}
                  </button>
                </div>

                <p className="text-sm text-paper/50 leading-relaxed">
                  LinkedIn doesn&rsquo;t accept photo uploads from a shared
                  link, so download the card (or use Share on mobile), then
                  attach it to a new LinkedIn post — paste the copied caption
                  alongside it.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="hairline" />
      </div>

      <footer className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-paper/40">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex flex-wrap items-center justify-start gap-x-5 gap-y-2">
            <a
              href="https://www.facebook.com/share/1BpSpd44Vb/"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-teal"
            >
              Facebook
            </a>
            <a
              href="https://society.jfn.ac.lk/compsoc/"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-teal"
            >
              CompSoc
            </a>
            <a
              href="https://www.linkedin.com/company/compsoc-uoj/"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-teal"
            >
              LinkedIn
            </a>
            <a
              href="https://www.linkedin.com/in/ravidu-nimsara-86bb2a313"
              target="_blank"
              rel="noreferrer"
              className="text-paper/55 transition-colors hover:text-teal"
            >
              Developed by Ravidu Nimsara
            </a>
          </div>
          <span className="text-right">{EVENT_NAME}</span>
        </div>
        <span className="w-full text-center text-xs text-paper/45">
          © 2026. All rights reserved. Organized by Computer Society of
          University of Jaffna.
        </span>
      </footer>
    </main>
  );
}

function Step({
  n,
  label,
  desc,
  active,
  done,
}: {
  n: string;
  label: string;
  desc: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex gap-3 md:gap-4 max-w-[220px] md:max-w-none">
      <span
        className={`font-mono text-xs pt-0.5 ${
          active ? "text-amber" : done ? "text-teal" : "text-paper/30"
        }`}
      >
        {n}
      </span>
      <div>
        <p
          className={`font-medium text-sm ${
            active ? "text-paper" : "text-paper/50"
          }`}
        >
          {label}
        </p>
        <p className="mt-1 text-xs text-paper/40 leading-relaxed hidden md:block">
          {desc}
        </p>
      </div>
    </div>
  );
}
