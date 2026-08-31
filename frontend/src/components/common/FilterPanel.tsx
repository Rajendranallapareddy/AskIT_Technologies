interface FilterOption {
  label: string;
  value: string;
}

interface FilterPanelProps {
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export default function FilterPanel({ options, value, onChange, label }: FilterPanelProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label && <span className="text-sm font-semibold text-navy-600 mr-1">{label}:</span>}
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
            value === opt.value ? 'bg-navy-700 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
