import { useEffect, useState } from 'react';
import { FileUp, Upload, Trash2, Briefcase } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate } from '../../utils/formatters';
import InternshipPicker, { useInternshipPicker } from './_InternshipPicker';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';

export default function Materials() {
  const { internships, internshipId, setInternshipId, isLoading: isLoadingInternships, error: internshipsError } = useInternshipPicker();
  const [materials, setMaterials] = useState<any[] | null>(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const load = () => {
    if (!internshipId) return;
    setMaterials(null);
    apiClient.get(`/trainer/internships/${internshipId}/materials`).then((res) => setMaterials(res.data.data)).catch((err) => {
      setMaterials([]);
      toast.error(getErrorMessage(err));
    });
  };

  useEffect(load, [internshipId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Please choose a file');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      await apiClient.post(`/trainer/internships/${internshipId}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Material uploaded — students can now see it in their Materials page');
      setTitle(''); setFile(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material? Students will no longer be able to see or download it.')) return;
    try {
      await apiClient.delete(`/trainer/materials/${id}`);
      toast.success('Material deleted');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout links={TRAINER_LINKS} title="Trainer Portal" pageTitle="Study Materials">
      {isLoadingInternships ? (
        <LoadingSpinner label="Loading your internships…" />
      ) : internshipsError ? (
        <ErrorState message={internshipsError} />
      ) : internships.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-8 h-8" />} title="No internships assigned yet" description="An admin needs to assign you to an internship before you can upload materials." />
      ) : (
        <>
          <div className="mb-5"><InternshipPicker internships={internships} value={internshipId} onChange={setInternshipId} /></div>

          <form onSubmit={handleUpload} className="card p-5 flex flex-col sm:flex-row gap-3 items-end mb-6">
            <div className="flex-1 w-full">
              <label className="label">Title</label>
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 1 Slides" />
            </div>
            <div className="flex-1 w-full">
              <label className="label">File</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input-field !py-2" />
            </div>
            <Button type="submit" isLoading={isUploading} icon={<Upload className="w-4 h-4" />}>Upload</Button>
          </form>

          {materials === null ? (
            <LoadingSpinner />
          ) : materials.length === 0 ? (
            <EmptyState icon={<FileUp className="w-8 h-8" />} title="No materials uploaded yet" />
          ) : (
            <div className="space-y-2">
              {materials.map((m: any) => (
                <div key={m.id} className="card p-4 flex items-center justify-between">
                  <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-0 hover:text-orange-600">
                    <span className="font-semibold text-navy-800 text-sm">{m.title}</span>
                  </a>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-navy-400">{formatDate(m.createdAt)}</span>
                    <button onClick={() => handleDelete(m.id)} className="text-navy-400 hover:text-red-500" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
