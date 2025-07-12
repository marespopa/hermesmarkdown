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
        <span className="text-black dark:text-white font-mono font-bold text-sm">{label}</span>
        <input
          className="bg-white dark:bg-gray-900 text-black dark:text-white border-2 border-black rounded-none font-mono font-bold px-2 py-2 focus:outline-none placeholder-gray-500"
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
