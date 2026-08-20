# Frame Studio

A one-page web app for event participants: upload a photo, it drops into your
event frame automatically, then download or share it — built to post
straight to LinkedIn.

- Everything runs **in the browser** (canvas compositing). No server, no
  storage, no user photos ever uploaded anywhere — good for privacy and for
  Vercel's free tier.
- Works on desktop and mobile. On mobile browsers that support the Web Share
  API, "Share…" opens the native share sheet (LinkedIn app included, if
  installed). Everywhere else, it downloads the finished PNG.

## 1. Swap in your real frame

A placeholder frame is at `public/frame.png` — replace it with yours:

1. Export your frame as a **PNG with a transparent center** (the area where
   the participant's photo should show through must be transparent alpha,
   not white).
2. Make it **square, 1080×1080px** (or any square size — just keep it
   square, since the canvas is 1:1). If your frame isn't square, letterbox
   it onto a transparent 1080×1080 canvas in your image editor first.
3. Save it as `public/frame.png`, overwriting the placeholder. Keep the
   filename the same, or update `FRAME_SRC` in `app/page.tsx`.

Also update the two constants near the top of `app/page.tsx`:

```ts
const EVENT_NAME = "Your Event Name";
const CAPTION = "I'm at Your Event Name today! 🎉 #YourHashtag #YourEvent2026";
```

`EVENT_NAME` shows in the page header. `CAPTION` is what "Copy LinkedIn
caption" copies to the clipboard for participants to paste alongside their
downloaded photo.

## 2. Run it locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## 3. Deploy to Vercel

**Option A — Vercel CLI (fastest):**

```bash
npm install -g vercel
vercel        # first deploy, follow the prompts
vercel --prod # promote to your production URL
```

**Option B — GitHub + Vercel dashboard:**

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Framework preset auto-detects as **Next.js** — leave build settings
   default (`npm run build`, output handled automatically).
4. Click **Deploy**. You'll get a `https://your-project.vercel.app` link —
   that's the link to send your session participants.

No environment variables or backend setup needed.

## Notes on "posting to LinkedIn"

LinkedIn's share links only accept a URL to share (they can't accept an
uploaded image via a link), and posting images on someone's behalf requires
LinkedIn's approved Marketing API with OAuth — heavy for a one-off event
tool. This app takes the practical path instead: participants download (or
share via their phone's native share sheet) the finished image, then attach
it to a LinkedIn post themselves, with a ready-made caption a tap away.

## Customizing further

- `app/page.tsx` — all the interactive logic (upload, pan/zoom, draw,
  download, share) and page copy.
- `app/globals.css` / `tailwind.config.ts` — colors, the checkerboard
  transparency preview, card shadow.
- The canvas is a fixed **1080×1080** square (`CANVAS_SIZE` in
  `app/page.tsx`) — LinkedIn-friendly for a square post image.
