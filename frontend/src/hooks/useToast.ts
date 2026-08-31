import toast from 'react-hot-toast';

// Centralizes toast styling so every success/error message looks consistent
// with the ASK IT brand instead of relying on default react-hot-toast styles.
export function useToast() {
  return {
    success: (msg: string) =>
      toast.success(msg, { style: { borderRadius: '12px', background: '#1e3a8a', color: '#fff' } }),
    error: (msg: string) =>
      toast.error(msg, { style: { borderRadius: '12px', background: '#7c2d12', color: '#fff' } }),
    info: (msg: string) => toast(msg, { icon: 'ℹ️', style: { borderRadius: '12px' } }),
  };
}
