import React from 'react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onFocus?: () => void;
  icon?: React.ReactNode;
  unit?: string;
  className?: string;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onFocus,
  icon,
  unit,
  className = ""
}) => {
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <label className="flex items-center text-[10px] text-gray-400">
          {icon && <span className="mr-1.5 opacity-70">{icon}</span>}
          {label}
        </label>
        <div className="flex items-center">
            <input
                type="number"
                value={value}
                step={step}
                onFocus={onFocus}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange(val);
                }}
                className="w-12 bg-[#111] border border-gray-700 text-gray-300 text-[10px] rounded px-1 py-0.5 text-right focus:border-orange-500 focus:outline-none"
            />
            {unit && <span className="ml-1 text-[9px] text-gray-600">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onMouseDown={onFocus}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 block mt-1"
      />
    </div>
  );
};

export default SliderControl;