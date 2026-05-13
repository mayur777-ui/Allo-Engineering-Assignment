interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
}

export function Alert({ type, message, onClose }: AlertProps) {
  const bgColorMap = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  const textColorMap = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800',
  };

  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '!',
  };

  return (
    <div className={`border rounded-lg p-4 ${bgColorMap[type]} mb-4`}>
      <div className="flex items-start gap-3">
        <span className={`text-lg font-bold ${textColorMap[type]}`}>
          {iconMap[type]}
        </span>
        <div className="flex-1">
          <p className={`${textColorMap[type]} text-sm font-medium`}>
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${textColorMap[type]} hover:opacity-70 text-lg font-bold`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
