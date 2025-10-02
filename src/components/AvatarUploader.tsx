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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5MB).'); return; }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); return; }

      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/png'
      });
      if (upErr) { setError('Upload failed'); return; }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) { setError('Could not get public URL'); return; }

      const { error: profErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (profErr) { setError('Profile update failed'); return; }

      setPreview(publicUrl);
      onUploaded?.(publicUrl);
    } catch (e) {
      setError('Unexpected error');
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
        </div>
      </div>
    </form>
  );
}
