interface Props {
  name: string;
  label: string;
  value: string | number | undefined;
  placeholder?: string;
  helperText?: string;
  handleChange: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}

const Textarea = ({
  name,
  label,
  value,
  placeholder,
  helperText,
  handleChange,
}: Props) => {
  return (
    <div className="my-4">
      <label className="flex flex-col">
        <span className="text-black font-bold text-sm">{label}</span>
        <textarea
          className="bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-400 dark:border-neutral-600 rounded-none font-bold px-2 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-neutral-500"
          rows={3}
          aria-label={label}
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
        />
      </label>
      {helperText && <p className="text-neutral-500 dark:text-neutral-400 text-xs">{helperText}</p>}
    </div>
  );
};

export default Textarea;
