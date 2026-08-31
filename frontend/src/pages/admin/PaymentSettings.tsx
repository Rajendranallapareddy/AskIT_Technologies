import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminPaymentApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';

const ALL_METHODS = ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'BANK_TRANSFER', 'QR'];

export default function PaymentSettings() {
  const links = useAdminLinks();
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    adminPaymentApi.getSettings().then((res) => setSettings(res.data.data)).catch((err) => {
      setSettings({ gstPercentage: 0, currency: 'INR', activeGateway: 'RAZORPAY', allowedMethods: [], autoApproveOnPay: false });
      toast.error(getErrorMessage(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMethod = (method: string) => {
    const current: string[] = settings.allowedMethods || [];
    setSettings({
      ...settings,
      allowedMethods: current.includes(method) ? current.filter((m) => m !== method) : [...current, method],
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await adminPaymentApi.updateSettings(settings);
      toast.success('Payment settings updated');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Payment Settings">
      {!settings ? (
        <LoadingSpinner />
      ) : (
        <div className="max-w-2xl card p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Default GST Percentage</label>
              <input type="number" className="input-field" value={settings.gstPercentage} onChange={(e) => setSettings({ ...settings, gstPercentage: e.target.value })} />
              <p className="text-xs text-navy-400 mt-1">Applied to internships that don't set their own GST rate.</p>
            </div>
            <div>
              <label className="label">Currency</label>
              <input className="input-field" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Active Payment Gateway</label>
            <select className="input-field max-w-xs" value={settings.activeGateway} onChange={(e) => setSettings({ ...settings, activeGateway: e.target.value })}>
              <option value="RAZORPAY">Razorpay</option>
              <option value="MANUAL">Manual / Offline only</option>
            </select>
            <p className="text-xs text-navy-400 mt-1">Requires the matching API keys to be set in the backend .env file.</p>
          </div>

          <div>
            <label className="label">Enabled Payment Methods</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMethod(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    (settings.allowedMethods || []).includes(m) ? 'bg-orange-500 text-white' : 'bg-navy-50 text-navy-500'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-navy-100 cursor-pointer">
            <input type="checkbox" checked={settings.autoApproveOnPay} onChange={(e) => setSettings({ ...settings, autoApproveOnPay: e.target.checked })} className="w-4 h-4 rounded border-navy-300 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-navy-800">Auto-approve registrations on successful payment</p>
              <p className="text-xs text-navy-500">If off, paid registrations still require manual admin approval after payment.</p>
            </div>
          </label>

          <Button onClick={handleSave} isLoading={isSaving} icon={<Save className="w-4 h-4" />}>Save Settings</Button>
        </div>
      )}
    </DashboardLayout>
  );
}
