interface Props {
  name: string;
  label?: string; // Made optional
  value: string | number | undefined;
  placeholder?: string;
  helperText?: string;
  handleChange: (e: React.FormEvent<HTMLInputElement>) => void;
  type?: "number" | "text";
  validation?: {
    min: number;
    max: number;
  };
  onClear?: () => void; // Optional clear handler
}

const Input = ({
  name,
  label,
  value,
  placeholder,
  helperText,
  handleChange,
  type = "text",
  validation,
  onClear,
}: Props) => {
  return (
    <div className="my-4 relative">
      <label className="flex flex-col">
        {label && (
          <span className="text-xs text-neutral-400 dark:text-neutral-400 mb-1">{label}</span>
        )}
        <input
          className="rounded-lg px-5 py-4 pr-10 text-base transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none select-none border bg-white text-black border-black shadow hover:bg-amber-50 focus-visible:ring-black dark:bg-neutral-700 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:ring-white placeholder-neutral-500 dark:placeholder-neutral-600"
          type={type}
          aria-label={label}

          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          min={validation?.min}
          max={validation?.max}
        />
        {onClear && value && String(value).length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-1 focus:outline-none"
            tabIndex={-1}
            aria-label="Clear input"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L14 14M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </label>
      {helperText && <p className="text-gray-500 dark:text-gray-400 text-xs">{helperText}</p>}
    </div>
  );
};

export default Input;
