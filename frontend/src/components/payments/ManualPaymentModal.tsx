import { useState } from 'react';
import {
  Copy,
  Check,
  Landmark,
  QrCode,
  Send,
} from 'lucide-react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import { paymentApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatMoney } from '../../utils/formatters';
import { getImageUrl } from '../../utils/imageUrl';

export interface ManualAccount {
  id: string;
  type: 'UPI' | 'BANK_ACCOUNT';
  label: string;
  upiId: string | null;
  qrCodeUrl: string | null;
  accountHolderName: string | null;
  accountNumberMasked: string | null;
  ifsc: string | null;
  branch: string | null;
}

function CopyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Clipboard unavailable.
      // The value is still visible for manual copying.
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 bg-navy-50 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-navy-400">
          {label}
        </p>

        <p className="text-sm font-mono font-semibold text-navy-800 truncate">
          {value}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-navy-400 hover:text-orange-500"
        title="Copy"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountDue: number;
  paymentId: string;
  accounts: ManualAccount[];
  onReferenceSubmitted?: () => void;
}

export default function ManualPaymentModal({
  isOpen,
  onClose,
  amountDue,
  paymentId,
  accounts,
  onReferenceSubmitted,
}: ManualPaymentModalProps) {
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toast = useToast();

  const upiAccounts = accounts.filter(
    (account) => account.type === 'UPI'
  );

  const bankAccounts = accounts.filter(
    (account) => account.type === 'BANK_ACCOUNT'
  );

  const handleSubmitReference = async () => {
    if (!reference.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await paymentApi.submitReference(
        paymentId,
        reference.trim()
      );

      setSubmitted(true);

      toast.success(
        'Reference submitted — an admin will verify and confirm your payment shortly.'
      );

      onReferenceSubmitted?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReference('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pay via UPI / Bank Transfer"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">

        {/* Amount */}

        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-orange-800">
            Amount to pay
          </span>

          <span className="text-2xl font-extrabold text-orange-600">
            {formatMoney(amountDue)}
          </span>
        </div>

        {/* Payment accounts */}

        {accounts.length === 0 ? (
          <p className="text-sm text-navy-500 bg-navy-50 rounded-lg p-4">
            No UPI or bank account has been set up yet. Please contact
            ASK IT Technologies directly to arrange payment.
          </p>
        ) : (
          <div className="space-y-4">

            {/* UPI Accounts */}

            {upiAccounts.map((account) => {
              const qrImageUrl = getImageUrl(
                account.qrCodeUrl
              );

              return (
                <div
                  key={account.id}
                  className="border border-navy-100 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="w-4 h-4 text-orange-500" />

                    <p className="font-bold text-navy-900 text-sm">
                      {account.label}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">

                    {/* QR Code */}

                    {qrImageUrl && (
                      <div className="shrink-0 bg-white rounded-xl border border-navy-100 p-2">
                        <img
                          src={qrImageUrl}
                          alt={`${account.label} QR code`}
                          className="w-40 h-40 rounded-lg object-contain"
                          onError={(e) => {
                            console.error(
                              'Failed to load student payment QR:',
                              qrImageUrl
                            );

                            e.currentTarget.style.display =
                              'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="flex-1 w-full space-y-2">

                      {/* UPI ID */}

                      {account.upiId && (
                        <CopyField
                          label="UPI ID"
                          value={account.upiId}
                        />
                      )}

                      <p className="text-xs text-navy-400">
                        Scan the QR code with any UPI app
                        (GPay, PhonePe, Paytm…) or pay
                        directly to the UPI ID above.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bank Accounts */}

            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="border border-navy-100 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Landmark className="w-4 h-4 text-orange-500" />

                  <p className="font-bold text-navy-900 text-sm">
                    {account.label}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {account.accountHolderName && (
                    <CopyField
                      label="Account Holder"
                      value={account.accountHolderName}
                    />
                  )}

                  {account.accountNumberMasked && (
                    <CopyField
                      label="Account Number"
                      value={account.accountNumberMasked}
                    />
                  )}

                  {account.ifsc && (
                    <CopyField
                      label="IFSC"
                      value={account.ifsc}
                    />
                  )}

                  {account.branch && (
                    <CopyField
                      label="Branch"
                      value={account.branch}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction reference */}

        <div className="pt-2 border-t border-navy-100">
          {submitted ? (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-green-700">
                Reference submitted!
              </p>

              <p className="text-xs text-green-600 mt-1">
                An admin will verify your payment and
                confirm it shortly. You can check its
                status anytime from Payment History.
              </p>
            </div>
          ) : (
            <>
              <label className="label">
                Already paid? Enter your UTR / transaction
                reference
              </label>

              <div className="flex gap-2">
                <input
                  className="input-field"
                  value={reference}
                  onChange={(e) =>
                    setReference(e.target.value)
                  }
                  placeholder="e.g. 402812345678 or bank transaction ID"
                />

                <Button
                  className="shrink-0 !px-4"
                  isLoading={isSubmitting}
                  disabled={!reference.trim()}
                  onClick={handleSubmitReference}
                  icon={
                    <Send className="w-4 h-4" />
                  }
                >
                  Submit
                </Button>
              </div>

              <p className="text-xs text-navy-400 mt-2">
                This doesn't confirm payment automatically
                — an admin verifies it against their
                bank/UPI statement and marks it paid.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}