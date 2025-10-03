"use client";
import { useRef, useState } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/browserClient';
import { resizeImage } from '@/lib/images/resize';
import Cropper, { Area } from 'react-easy-crop';
import { cropImage } from '@/lib/images/crop';

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
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  async function processAndUpload(file: File) {
    setError(null);
    setInfo(null);
    if (!file.type.startsWith('image/')) { setError('Please choose an image.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('File too large (max 8MB).'); return; }

    setUploading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { setError('Not authenticated'); return; }

      let working: File | Blob = file;
      if (croppedAreaPixels) {
        // Crop first
        const croppedBlob = await cropImage(file, croppedAreaPixels, 'image/webp', 0.92);
        working = croppedBlob;
      }

      // Resize & compress after crop
      const processed = await resizeImage(new File([working], file.name, { type: (working as Blob).type || file.type }), { maxDimension: 512, mimeType: 'image/webp', quality: 0.85 });

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
      setRawFile(file);
      setCropping(true);
      setError(null);
      setInfo(null);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }

  const onCropComplete = (_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  };

  async function handleUploadCropped() {
    if (!rawFile) return;
    setCropping(false);
    await processAndUpload(rawFile);
    setRawFile(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  function cancelCrop() {
    setCropping(false);
    setRawFile(null);
    setCroppedAreaPixels(null);
    setPreview(initialUrl);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
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
            disabled={uploading || cropping}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:text-sm file:font-medium hover:file:bg-gray-50 disabled:opacity-50"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && !error && <p className="text-sm text-green-600">{info}</p>}
        </div>
      </div>

      {cropping && preview && (
        <div className="relative h-80 w-full rounded-lg overflow-hidden border">
          <Cropper
            image={preview}
            crop={crop}
            zoom={zoom}
            aspect={1}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition={false}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex flex-col gap-3">
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
              aria-label="Zoom"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelCrop}
                className="px-3 py-1.5 rounded-md text-sm bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20"
              >Cancel</button>
              <button
                type="button"
                onClick={handleUploadCropped}
                disabled={uploading}
                className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >{uploading ? 'Uploading…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
