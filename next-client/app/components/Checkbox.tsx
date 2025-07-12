interface CheckboxProps {
  name: string;
  label: string;
  checked: boolean;
  helperText?: string;
  handleChange: (e: React.FormEvent<HTMLInputElement>) => void;
}

const Checkbox = ({
  name,
  label,
  checked,
  helperText,
  handleChange,
}: CheckboxProps) => {
  return (
    <div className="my-4">
      <label className="flex items-center space-x-2 text-black font-mono font-bold">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={handleChange}
          className="border-2 border-black bg-white rounded-none font-mono font-bold w-5 h-5 focus:outline-none"
          aria-label={label}
        />
        <span className="text-gray-600 dark:text-gray-300 text-sm">{label}</span>
      </label>
      {helperText && <p className="text-gray-500 dark:text-gray-400 text-xs">{helperText}</p>}
    </div>
  );
};

export default Checkbox;
