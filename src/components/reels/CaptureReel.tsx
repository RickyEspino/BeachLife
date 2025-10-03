"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/browserClient';
import type { ReelItem } from './ReelCard';

interface Props {
  onCreated: (item: ReelItem) => void;
}

export default function CaptureReel({ onCreated }: Props) {
  const supabase = createSupabaseBrowserClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        if (!active) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera access denied');
      } finally {
        setInitializing(false);
      }
    }
    init();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facing]);

  const capture = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    // We want portrait 9:16 if possible; crop center if landscape
    let targetW = w;
    let targetH = h;
    const aspect = w / h;
    const desired = 9/16;
    let sx = 0, sy = 0, sw = w, sh = h;
    if (aspect > desired) {
      // too wide, crop width
      sw = Math.round(h * desired);
      sx = Math.round((w - sw) / 2);
    } else if (aspect < desired) {
      // too tall / narrow width: crop height
      sh = Math.round(w / desired);
      sy = Math.round((h - sh) / 2);
    }
    targetW = 1080; // scale to 1080 wide portrait reference
    targetH = Math.round(targetW * (16/9));
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    canvas.toBlob(blob => {
      if (blob) {
        setCapturedBlob(blob);
      }
    }, 'image/webp', 0.9);
  }, []);

  const retake = () => {
    setCapturedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Generate / revoke object URL for preview when capturedBlob changes
  useEffect(() => {
    if (!capturedBlob) return;
    const url = URL.createObjectURL(capturedBlob);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [capturedBlob]);

  const upload = useCallback(async () => {
    if (!capturedBlob) return;
    setUploading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth required');
      const path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage.from('reels').upload(path, capturedBlob, { contentType: 'image/webp', upsert: false });
      if (upErr) throw upErr;
      const res = await fetch('/api/reels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imagePath: path, caption: caption.trim() || undefined }) });
      if (!res.ok) throw new Error('Create failed');
      const item: ReelItem = await res.json();
      onCreated(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setUploading(false);
    }
  }, [capturedBlob, caption, supabase, onCreated]);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-gray-800">Capture Reel</h2>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      <div className="flex items-center gap-2 text-[10px] text-gray-600">
        <span>Camera:</span>
        <button type="button" onClick={() => { setInitializing(true); setFacing(f => f === 'environment' ? 'user' : 'environment'); }} className="px-2 py-1 rounded border border-gray-300 text-xs bg-white hover:bg-gray-50">{facing === 'environment' ? 'Switch to Front' : 'Switch to Back'}</button>
      </div>
      {!capturedBlob && (
        <div className="relative aspect-[9/16] w-40 bg-black rounded overflow-hidden">
          {initializing && <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">Starting camera…</div>}
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}
      {capturedBlob && previewUrl && (
        <div className="relative aspect-[9/16] w-40 rounded overflow-hidden bg-gray-200">
          <Image
            src={previewUrl}
            alt="Captured preview"
            fill
            unoptimized
            sizes="160px"
            className="object-cover"
            priority
          />
        </div>
      )}
      {!capturedBlob && !initializing && (
        <button type="button" onClick={capture} className="px-3 py-2 text-sm rounded bg-emerald-600 text-white shadow disabled:opacity-50">Capture</button>
      )}
      {capturedBlob && (
        <div className="flex gap-2">
          <button type="button" onClick={retake} className="px-3 py-2 text-xs rounded border border-gray-300 text-gray-600">Retake</button>
          <button type="button" onClick={upload} disabled={uploading} className="px-3 py-2 text-sm rounded bg-emerald-600 text-white disabled:opacity-50">{uploading ? 'Uploading…' : 'Post'}</button>
        </div>
      )}
      <textarea
        placeholder="Caption (optional)"
        value={caption}
        maxLength={300}
        onChange={e => setCaption(e.target.value)}
        className="w-full resize-none rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        rows={3}
      />
      <div className="text-[10px] text-gray-500 flex justify-between">
        <span>{caption.length}/300</span>
        {uploading && <span>Uploading…</span>}
      </div>
    </div>
  );
}
