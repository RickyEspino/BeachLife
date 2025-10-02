"use client";
import { useRef, useState, FormEvent } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/browserClient';

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

  async function ensureProfile(userId: string) {
    // Upsert a profile row if it doesn't exist so the update doesn't silently affect 0 rows
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
    if (upsertErr) {
      // Not fatal for uploading avatar but note it
      console.warn('Profile upsert warning', upsertErr);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5MB).'); return; }

    try {
      setUploading(true);
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) { setError(`Auth error: ${authErr.message}`); return; }
      if (!user) { setError('Not authenticated'); return; }

      await ensureProfile(user.id);

      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const folder = `avatars/${user.id}`; // we keep a per-user folder
      const filename = `avatar-${Date.now()}.${ext}`;
      const path = `${folder}/${filename}`;

      // Optional: clean older files to avoid accumulation (best effort)
      try {
        const { data: listData } = await supabase.storage.from('avatars').list(folder.replace(/^avatars\//, ''), { limit: 20 });
        if (listData && listData.length > 5) {
          // delete all older files except newest preview (not critical if fails)
          const toRemove = listData.map(f => `${folder.replace(/^avatars\//,'')}/${f.name}`);
          await supabase.storage.from('avatars').remove(toRemove);
        }
      } catch (cleanupErr) {
        console.warn('Avatar cleanup failed', cleanupErr);
      }

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/png'
      });
      console.log('UPLOAD RES', { path, fileType: file.type, size: file.size }, upErr);
      if (upErr) {
        if (upErr.message.toLowerCase().includes('duplicate')) {
          setError('File already exists and cannot be replaced. Try a different image.');
        } else {
          setError(`Upload failed: ${upErr.message}`);
        }
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) { setError('Could not get public URL'); return; }

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

  function handleFileChange() {
    const file = inputRef.current?.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>      
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
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:text-sm file:font-medium hover:file:bg-gray-50"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Save Avatar'}
            </button>
            {preview && initialUrl && preview !== initialUrl && (
              <button
                type="button"
                onClick={() => { setPreview(initialUrl); if (inputRef.current) inputRef.current.value=''; }}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Reset
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && !error && <p className="text-sm text-green-600">{info}</p>}
        </div>
      </div>
    </form>
  );
}
