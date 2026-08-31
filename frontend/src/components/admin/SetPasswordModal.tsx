import { useState } from 'react';
import { Eye, EyeOff, Copy, RefreshCw, Check, ShieldAlert } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useToast } from '../../hooks/useToast';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=]).{8,}$/;

// Generates a random password that always satisfies PASSWORD_REGEX (one of
// each required character class, padded out with a mixed pool) — good
// enough to hand a Sub Admin/Trainer a fresh credential on the spot.
function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '@$!%*?&#^';
  const all = upper + lower + digits + special;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: 8 }, () => pick(all));
  const chars = [...required, ...rest];
  // Shuffle so the required characters aren't always in the same 4 slots.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  onSubmit: (newPassword: string) => Promise<void>;
}

// Note on "viewing" existing passwords: passwords are stored as one-way
// bcrypt hashes (industry-standard practice), so the original text is never
// recoverable — not by a Super Admin, not by anyone with database access.
// What this modal gives a Super Admin instead is the ability to SET a new
// password for a Sub Admin or Trainer at any time, shown once here so it
// can be copied and shared with them securely.
export default function SetPasswordModal({ isOpen, onClose, targetName, onSubmit }: SetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const isValid = PASSWORD_REGEX.test(password);

  const handleGenerate = () => {
    setPassword(generateStrongPassword());
    setShowPassword(true);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please select and copy the password manually.');
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      await onSubmit(password);
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(true);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Set Password — ${targetName}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Passwords are securely hashed and can never be viewed after the fact — not even by a Super Admin. You can,
            however, set a brand-new password below at any time. Copy it now and share it with {targetName} directly —
            it won't be shown again.
          </p>
        </div>

        <div>
          <label className="label">New Password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-9"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setCopied(false); }}
                placeholder="Type one, or generate a strong one →"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button type="button" variant="outline" className="!py-2 shrink-0 !px-3" onClick={handleGenerate} title="Generate a strong password">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" className="!py-2 shrink-0 !px-3" onClick={handleCopy} disabled={!password} title="Copy to clipboard">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          {password && !isValid && (
            <p className="text-xs text-red-500 mt-1.5">
              Must be at least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
            </p>
          )}
        </div>

        <Button className="w-full" isLoading={isSaving} disabled={!isValid} onClick={handleSubmit}>
          Set Password
        </Button>
      </div>
    </Modal>
  );
}
