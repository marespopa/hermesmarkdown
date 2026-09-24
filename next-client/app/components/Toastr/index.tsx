import { toast } from 'react-hot-toast';

const toastConfig = {
  duration: 3000,
  position: 'bottom-right' as const,
  style: {
    fontFamily: 'var(--font-plus-jakarta), ui-sans-serif, sans-serif',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    background: 'var(--surface-raised)',
    color: 'var(--fg)',
    boxShadow: '0 8px 24px rgb(0 0 0 / 12%)',
  },
};

const successConfig = {
  ...toastConfig,
  style: {
    ...toastConfig.style,
    borderColor: 'color-mix(in srgb, var(--moss) 35%, var(--border-subtle))',
  },
};

const errorConfig = {
  ...toastConfig,
  duration: 4000,
  style: {
    ...toastConfig.style,
    borderColor: 'color-mix(in srgb, #c65b4a 45%, var(--border-subtle))',
  },
};

const copyConfig = {
  ...toastConfig,
  duration: 2000,
  style: {
    ...toastConfig.style,
    borderColor: 'color-mix(in srgb, var(--moss) 35%, var(--border-subtle))',
  },
};

export const showSuccessToast = (message: string) => {
  return toast.success(message, successConfig);
};

export const showErrorToast = (message: string) => {
  return toast.error(message, errorConfig);
};

export const showCopyToast = (message: string) => {
  return toast.success(message, copyConfig);
};

export const showSaveStateToast = (status: 'saved' | 'error') => {
  if (status === 'saved') {
    return showSuccessToast('Settings saved!');
  }

  if (status === 'error') {
    return showErrorToast('Failed to save settings');
  }
};

export default showSaveStateToast; 