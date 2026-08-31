import { useEffect, useState } from 'react';
import { Plus, Trash2, Ban, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminPaymentApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate, formatMoney } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = {
  code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', maxDiscountAmount: '',
  minOrderAmount: '', usageLimit: '', validFrom: '', validUntil: '',
};

export default function AdminCoupons() {
  const links = useAdminLinks();
  const [coupons, setCoupons] = useState<any[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const toast = useToast();

  const load = () => {
    setCoupons(null);
    adminPaymentApi.coupons().then((res) => setCoupons(res.data.data)).catch((err) => { setCoupons([]); toast.error(getErrorMessage(err)); });
  };
  useEffect(load, []);

  const handleCreate = async () => {
    try {
      await adminPaymentApi.createCoupon(form);
      toast.success('Coupon created');
      setCreateOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleToggle = async (c: any) => {
    try {
      await adminPaymentApi.updateCoupon(c.id, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Coupon disabled' : 'Coupon enabled');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (c: any) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    try { await adminPaymentApi.deleteCoupon(c.id); toast.success('Coupon deleted'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const columns: Column<any>[] = [
    { header: 'Code', render: (c) => <span className="font-mono font-bold">{c.code}</span> },
    { header: 'Discount', render: (c) => c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatMoney(Number(c.discountValue)) },
    { header: 'Usage', render: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}` },
    { header: 'Valid Until', render: (c) => c.validUntil ? formatDate(c.validUntil) : 'No expiry' },
    { header: 'Status', render: (c) => (
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {c.isActive ? 'Active' : 'Disabled'}
      </span>
    )},
    { header: 'Actions', render: (c) => (
      <div className="flex items-center gap-2">
        <button onClick={() => handleToggle(c)} className="text-navy-400 hover:text-orange-500">{c.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}</button>
        <button onClick={() => handleDelete(c)} className="text-navy-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Coupons & Promotions">
      <div className="flex justify-end mb-5">
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>New Coupon</Button>
      </div>
      <DataTable columns={columns} rows={coupons} keyField={(c) => c.id} emptyTitle="No coupons yet" />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Coupon">
        <div className="space-y-4">
          <div><label className="label">Code</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" /></div>
          <div><label className="label">Description</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Discount Type</label>
              <select className="input-field" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                <option value="PERCENTAGE">Percentage</option><option value="FLAT">Flat Amount</option>
              </select>
            </div>
            <div><label className="label">Discount Value</label><input type="number" className="input-field" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Max Discount (₹)</label><input type="number" className="input-field" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} /></div>
            <div><label className="label">Min Order (₹)</label><input type="number" className="input-field" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label">Usage Limit</label><input type="number" className="input-field" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /></div>
            <div><label className="label">Valid From</label><input type="date" className="input-field" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></div>
            <div><label className="label">Valid Until</label><input type="date" className="input-field" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
          </div>
          <Button className="w-full" onClick={handleCreate}>Create Coupon</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
