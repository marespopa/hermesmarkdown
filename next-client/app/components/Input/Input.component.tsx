interface Props {
  name: string;
  label: string;
  value: string | number | undefined;
  placeholder?: string;
  helperText?: string;
  handleChange: (e: React.FormEvent<HTMLInputElement>) => void;
  type?: "number" | "text";
  validation?: {
    min: number;
    max: number;
  };
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
}: Props) => {
  return (
    <div className="my-4">
      <label className="flex flex-col">
        <span className="text-gray-600 dark:text-gray-300 text-sm">{label}</span>
        <input
          className="bg-white dark:bg-gray-700 px-2 py-2 rounded-sm border-2 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
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
      </label>
      {helperText && <p className="text-gray-500 dark:text-gray-400 text-xs">{helperText}</p>}
    </div>
  );
};

export default Input;
