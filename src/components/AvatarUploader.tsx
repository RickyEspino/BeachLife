"use client";
import { useRef, useState } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/browserClient';
import { resizeImage } from '@/lib/images/resize';

interface AvatarUploaderProps {
  initialUrl?: string;
  onUploaded?: (publicUrl: string) => void;
  className?: string;
}

export default function AvatarUploader({ initialUrl, onUploaded, className = '' }: AvatarUploaderProps) {
  const supabase = createSupabaseBrowserClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | undefined>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handlePick(file: File) {
    setError(null);
    setInfo(null);
    if (!file.type.startsWith('image/')) { setError('Please choose an image.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('File too large (max 8MB).'); return; }

    setUploading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setError('Not authenticated'); return; }

      // Resize & compress to constrain bandwidth and strip EXIF
      const processed = await resizeImage(file, { maxDimension: 512, mimeType: 'image/webp', quality: 0.85 });

      const ext = 'webp';
      const path = `${user.id}/avatar.${ext}`; // stable path; webp output

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, processed, { upsert: true, contentType: 'image/webp' });

      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`; // bust caching

      const { error: profErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (profErr) { setError(`Profile update failed: ${profErr.message}`); return; }

      setPreview(publicUrl);
      setInfo('Avatar updated');
      onUploaded?.(publicUrl);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Unexpected error: ${message}`);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange() {
    const file = inputRef.current?.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      handlePick(file);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 rounded-full overflow-hidden bg-gray-100 border">
          {preview ? (
            <Image src={preview} alt="Avatar preview" fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No avatar</div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={uploading}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:text-sm file:font-medium hover:file:bg-gray-50 disabled:opacity-50"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && !error && <p className="text-sm text-green-600">{info}</p>}
        </div>
      </div>
    </div>
  );
}
