"use client";
import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/browserClient';
import type { ReelItem } from './ReelCard';

interface Props {
  onCreated?: (item: ReelItem) => void;
}

export default function CreateReel({ onCreated }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFileName(null); setPreviewUrl(null); setCaption(''); setError(null);
  }, [previewUrl]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Must be an image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB cap
      setError('Image too large (max 10MB)');
      return;
    }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  setFileName(file.name);
  setPreviewUrl(URL.createObjectURL(file));
  };

  const compressToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const rawImg: HTMLImageElement = document.createElement('img');
      let tmpUrl: string | null = null;
      rawImg.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX = 2160; // cap dimension
          let { width, height } = rawImg;
          if (width > height && width > MAX) { height = Math.round(height * (MAX / width)); width = MAX; }
          else if (height > MAX) { width = Math.round(width * (MAX / height)); height = MAX; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas unsupported'));
          ctx.drawImage(rawImg, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (tmpUrl) { URL.revokeObjectURL(tmpUrl); tmpUrl = null; }
            if (!blob) return reject(new Error('Compression failed'));
            resolve(blob);
          }, 'image/webp', 0.85);
        } catch (err) {
          if (tmpUrl) { URL.revokeObjectURL(tmpUrl); tmpUrl = null; }
          reject(err instanceof Error ? err : new Error('Compression error'));
        }
      };
      rawImg.onerror = () => {
        if (tmpUrl) { URL.revokeObjectURL(tmpUrl); tmpUrl = null; }
        reject(new Error('Image load error'));
      };
      tmpUrl = URL.createObjectURL(file);
      rawImg.src = tmpUrl;
    });
  };

  const onSubmit = useCallback(async () => {
    if (!previewUrl || !fileName) return;
    setUploading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth required');
      const fileInput = inputRef.current?.files?.[0];
      if (!fileInput) throw new Error('Missing file');
      const blob = await compressToWebP(fileInput);
      const path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage.from('reels').upload(path, blob, { contentType: 'image/webp', upsert: false });
      if (upErr) throw upErr;
      const res = await fetch('/api/reels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imagePath: path, caption: caption.trim() || undefined }) });
      if (!res.ok) throw new Error('Create failed');
      const item: ReelItem = await res.json();
      onCreated?.(item);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setUploading(false);
    }
  }, [previewUrl, fileName, caption, supabase, onCreated, reset]);

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-4 bg-white/90 backdrop-blur rounded-md shadow border border-gray-200">
      <h2 className="text-sm font-semibold tracking-wide text-gray-800">Create Reel</h2>
      <label className="block text-[11px] font-medium text-gray-600">Media
        <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="mt-1 block w-full text-xs" aria-describedby="reel-media-hint" />
      </label>
      <p id="reel-media-hint" className="text-[10px] text-gray-500 -mt-1">High-res image, max 10MB. Auto compressed to WebP.</p>
      {previewUrl && (
        <div className="relative aspect-[9/16] w-28 overflow-hidden rounded bg-gray-200">
          <Image
            src={previewUrl}
            alt="preview"
            fill
            unoptimized
            sizes="112px" /* w-28 */
            className="object-cover"
            priority
          />
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
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>{caption.length}/300</span>
        {uploading && <span className="animate-pulse">Uploading…</span>}
      </div>
      <div aria-live="polite" className="sr-only">
        {uploading ? 'Uploading reel' : ''}
        {error ? `Error: ${error}` : ''}
      </div>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!previewUrl || uploading}
          className="flex-1 rounded bg-emerald-600 text-white text-sm font-medium py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >Post</button>
        <button type="button" onClick={reset} disabled={uploading} className="px-3 py-2 text-xs rounded border border-gray-300 text-gray-600 disabled:opacity-40">Reset</button>
      </div>
    </div>
  );
}
