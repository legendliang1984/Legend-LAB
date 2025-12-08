import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, GripHorizontal } from 'lucide-react';

interface FloatingWindowProps {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  onClose?: () => void;
  onFocus: () => void;
  onUpdate: (x: number, y: number, width: number, height: number) => void;
  children: React.ReactNode;
  minWidth?: number;
  minHeight?: number;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title,
  x,
  y,
  width,
  height,
  zIndex,
  onClose,
  onFocus,
  onUpdate,
  children,
  minWidth = 250,
  minHeight = 200
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startDims = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        onUpdate(startDims.current.x + dx, startDims.current.y + dy, width, height);
      }
      if (isResizing) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        onUpdate(x, y, Math.max(minWidth, startDims.current.w + dx), Math.max(minHeight, startDims.current.h + dy));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, x, y, width, height, minWidth, minHeight, onUpdate]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus();
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startDims.current = { x, y, w: width, h: height };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startDims.current = { x, y, w: width, h: height };
  };

  return (
    <div
      className="absolute bg-[#1c1c1c] border border-[#333] shadow-2xl rounded-lg overflow-hidden flex flex-col"
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}
      onMouseDown={onFocus}
    >
      {/* Header */}
      <div
        className="h-8 bg-[#252525] border-b border-[#333] flex items-center justify-between px-3 cursor-move select-none"
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex items-center text-gray-300 text-xs font-bold tracking-wide">
          <GripHorizontal className="w-3 h-3 mr-2 opacity-50" />
          {title}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center z-10"
        onMouseDown={handleResizeMouseDown}
      >
        <svg viewBox="0 0 6 6" className="w-2 h-2 fill-gray-500">
          <path d="M6 6L6 0L0 6Z" />
        </svg>
      </div>
    </div>
  );
};

export default FloatingWindow;