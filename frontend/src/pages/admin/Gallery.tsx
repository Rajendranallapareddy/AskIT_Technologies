import { useEffect, useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { apiClient } from '../../api/client';
import { publicApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

export default function AdminGallery() {
  const links = useAdminLinks();
  const [images, setImages] = useState<any[] | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const load = () => {
    setImages(null);
    publicApi.gallery().then((res) => setImages(res.data.data)).catch((err) => {
      setImages([]);
      toast.error(getErrorMessage(err));
    });
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Please choose an image to upload');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (caption) formData.append('caption', caption);
      if (category) formData.append('category', category);
      await apiClient.post('/admin/gallery', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Image uploaded');
      setCaption(''); setCategory(''); setFile(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      await apiClient.delete(`/admin/gallery/${id}`);
      toast.success('Image deleted');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Gallery">
      <form onSubmit={handleUpload} className="card p-5 flex flex-col sm:flex-row gap-3 items-end mb-6">
        <div className="flex-1 w-full">
          <label className="label">Image</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input-field !py-2" />
        </div>
        <div className="flex-1 w-full">
          <label className="label">Caption (optional)</label>
          <input className="input-field" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Batch 12 Graduation Day" />
        </div>
        <div className="flex-1 w-full">
          <label className="label">Category (optional)</label>
          <input className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Events" />
        </div>
        <Button type="submit" isLoading={isUploading} icon={<Upload className="w-4 h-4" />}>Upload</Button>
      </form>

      {images === null ? (
        <LoadingSpinner />
      ) : images.length === 0 ? (
        <EmptyState icon={<ImageIcon className="w-8 h-8" />} title="No images uploaded yet" description="Upload photos above — they'll appear on the public Gallery page immediately." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img: any) => (
            <div key={img.id} className="card p-0 overflow-hidden group relative">
              <img src={img.imageUrl} alt={img.caption || 'Gallery'} className="w-full h-40 object-cover" />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {img.caption && <p className="text-xs text-navy-600 font-medium px-3 py-2">{img.caption}</p>}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
