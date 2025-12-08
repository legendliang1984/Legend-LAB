import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "加载中..." }) => {
  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
      <Loader2 className="w-10 h-10 animate-spin mb-3 text-orange-500" />
      <p className="text-sm font-medium tracking-wide">{message}</p>
    </div>
  );
};

export default LoadingOverlay;