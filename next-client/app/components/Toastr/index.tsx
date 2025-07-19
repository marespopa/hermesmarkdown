import { toast } from 'react-hot-toast';

const toastConfig = {
  duration: 3000,
  position: 'bottom-right' as const,
  style: {
    fontSize: '14px',
    fontWeight: '600',
  },
};

const successConfig = {
  ...toastConfig,
  style: {
    ...toastConfig.style,
    background: '#10b981',
    color: '#fff',
  },
};

const errorConfig = {
  ...toastConfig,
  duration: 4000,
  style: {
    ...toastConfig.style,
    background: '#ef4444',
    color: '#fff',
  },
};

const copyConfig = {
  ...toastConfig,
  duration: 2000,
  style: {
    ...toastConfig.style,
    background: '#3b82f6',
    color: '#fff',
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