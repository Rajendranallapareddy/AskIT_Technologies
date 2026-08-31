import { useEffect, useState } from 'react';
import {
  Plus,
  Ban,
  CheckCircle,
  Trash2,
  Landmark,
  Upload,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { paymentAccountApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { getImageUrl } from '../../utils/imageUrl';
import DataTable, { Column } from '../../components/admin/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = {
  type: 'UPI',
  label: '',
  upiId: '',
  accountHolderName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
  gatewayName: '',
  merchantId: '',
  gatewayKeyId: '',
  gatewayKeySecret: '',
};

export default function PaymentAccounts() {
  const links = useAdminLinks();

  const [accounts, setAccounts] = useState<any[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();

  const load = () => {
    setAccounts(null);

    paymentAccountApi
      .list()
      .then((res) => {
        setAccounts(res.data.data);
      })
      .catch((err) => {
        setAccounts([]);
        toast.error(getErrorMessage(err));
      });
  };

  useEffect(load, []);

  // Show QR immediately when selected
  const handleQrSelect = (file: File | null) => {
    // Clean up old temporary preview
    if (qrPreview && qrPreview.startsWith('blob:')) {
      URL.revokeObjectURL(qrPreview);
    }

    setQrFile(file);

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setQrPreview(previewUrl);
    } else {
      setQrPreview(null);
    }
  };

  const resetForm = () => {
    if (qrPreview && qrPreview.startsWith('blob:')) {
      URL.revokeObjectURL(qrPreview);
    }

    setForm(emptyForm);
    setQrFile(null);
    setQrPreview(null);
  };

  const handleCreate = async () => {
    if (!form.label?.trim()) {
      toast.error('Please enter an account label');
      return;
    }

    if (form.type === 'UPI' && !form.upiId?.trim()) {
      toast.error('Please enter a UPI ID');
      return;
    }

    setIsSaving(true);

    try {
      await paymentAccountApi.create(form, qrFile);

      toast.success('Payment account added');

      setCreateOpen(false);

      resetForm();

      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (a: any) => {
    try {
      await paymentAccountApi.toggle(a.id);

      toast.success('Updated');

      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (a: any) => {
    if (!confirm(`Delete "${a.label}"?`)) {
      return;
    }

    try {
      await paymentAccountApi.remove(a.id);

      toast.success('Deleted');

      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'QR',

      render: (a) =>
        a.qrCodeUrl ? (
          <img
            src={getImageUrl(a.qrCodeUrl) || undefined}
            alt={`${a.label} QR`}
            className="w-12 h-12 rounded object-contain border border-navy-100 bg-white p-1"
            onError={(e) => {
              console.error(
                'Failed to load QR code:',
                getImageUrl(a.qrCodeUrl)
              );

              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="text-navy-300 text-xs">—</span>
        ),
    },

    {
      header: 'Label',

      render: (a) => (
        <span className="font-semibold text-navy-800">
          {a.label}
        </span>
      ),
    },

    {
      header: 'Type',

      render: (a) => a.type.replace('_', ' '),
    },

    {
      header: 'Details',

      render: (a) =>
        a.upiId ||
        a.accountNumberMasked ||
        a.merchantId ||
        '—',
    },

    {
      header: 'Status',

      render: (a) => (
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            a.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {a.isActive ? 'Active' : 'Disabled'}
        </span>
      ),
    },

    {
      header: 'Actions',

      render: (a) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggle(a)}
            className="text-navy-400 hover:text-orange-500"
            title={a.isActive ? 'Disable' : 'Enable'}
          >
            {a.isActive ? (
              <Ban className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => handleDelete(a)}
            className="text-navy-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      links={links}
      title="Super Admin"
      pageTitle="Payment Accounts"
    >
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-navy-500 flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5" />

          Bank details and gateway keys are encrypted at rest and never
          shown in full after saving.
        </p>

        <Button
          onClick={() => setCreateOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Account
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={accounts}
        keyField={(a) => a.id}
        emptyTitle="No payment accounts configured"
      />

      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        title="Add Payment Account"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {/* Account Type */}

          <div>
            <label className="label">
              Account Type
            </label>

            <select
              className="input-field"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value,
                })
              }
            >
              <option value="UPI">
                UPI
              </option>

              <option value="BANK_ACCOUNT">
                Bank Account
              </option>

              <option value="GATEWAY_KEYS">
                Gateway Keys
              </option>
            </select>
          </div>

          {/* Label */}

          <div>
            <label className="label">
              Label
            </label>

            <input
              className="input-field"
              value={form.label}
              onChange={(e) =>
                setForm({
                  ...form,
                  label: e.target.value,
                })
              }
              placeholder="e.g. Primary UPI"
            />
          </div>

          {/* UPI */}

          {form.type === 'UPI' && (
            <>
              <div>
                <label className="label">
                  UPI ID
                </label>

                <input
                  className="input-field"
                  value={form.upiId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      upiId: e.target.value,
                    })
                  }
                  placeholder="askit@upi"
                />
              </div>

              <div>
                <label className="label">
                  QR Code Image
                </label>

                <label className="flex items-center gap-3 border-2 border-dashed border-navy-200 rounded-xl p-4 cursor-pointer hover:border-orange-400 transition">

                  {qrPreview ? (
                    <img
                      src={qrPreview}
                      alt="QR preview"
                      className="w-20 h-20 object-contain rounded-lg border border-navy-100 bg-white p-1"
                    />
                  ) : (
                    <span className="w-20 h-20 rounded-lg bg-navy-50 flex items-center justify-center text-navy-300">

                      <Upload className="w-6 h-6" />

                    </span>
                  )}

                  <div>
                    <p className="text-sm text-navy-600">
                      {qrFile
                        ? qrFile.name
                        : 'Click to upload a QR code image'}
                    </p>

                    <p className="text-xs text-navy-400 mt-1">
                      JPG, JPEG or PNG
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) =>
                      handleQrSelect(
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </label>
              </div>
            </>
          )}

          {/* Bank Account */}

          {form.type === 'BANK_ACCOUNT' && (
            <>
              <div>
                <label className="label">
                  Account Holder Name
                </label>

                <input
                  className="input-field"
                  value={form.accountHolderName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accountHolderName: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">
                  Account Number
                </label>

                <input
                  className="input-field"
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accountNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    IFSC
                  </label>

                  <input
                    className="input-field"
                    value={form.ifsc}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ifsc: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    Branch
                  </label>

                  <input
                    className="input-field"
                    value={form.branch}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        branch: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </>
          )}

          {/* Gateway Keys */}

          {form.type === 'GATEWAY_KEYS' && (
            <>
              <div>
                <label className="label">
                  Gateway
                </label>

                <select
                  className="input-field"
                  value={form.gatewayName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gatewayName: e.target.value,
                    })
                  }
                >
                  <option value="">
                    Select…
                  </option>

                  <option value="RAZORPAY">
                    Razorpay
                  </option>

                  <option value="STRIPE">
                    Stripe
                  </option>

                  <option value="CASHFREE">
                    Cashfree
                  </option>

                  <option value="PHONEPE">
                    PhonePe
                  </option>
                </select>
              </div>

              <div>
                <label className="label">
                  Merchant ID
                </label>

                <input
                  className="input-field"
                  value={form.merchantId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      merchantId: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">
                  Key ID (public)
                </label>

                <input
                  className="input-field"
                  value={form.gatewayKeyId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gatewayKeyId: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">
                  Key Secret
                </label>

                <input
                  type="password"
                  className="input-field"
                  value={form.gatewayKeySecret}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gatewayKeySecret: e.target.value,
                    })
                  }
                />
              </div>

              <p className="text-xs text-navy-400">
                Note: live checkout still reads Razorpay credentials
                from the backend .env file. This entry is for
                record-keeping and future multi-gateway support.
              </p>
            </>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            isLoading={isSaving}
          >
            Save Account
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}