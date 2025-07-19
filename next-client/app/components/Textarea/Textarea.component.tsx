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
        <span className="text-xs text-neutral-400 dark:text-neutral-400 mb-1">{label}</span>
        <textarea
          className="rounded-lg px-5 py-4 text-base transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none select-none border bg-white text-black border-black shadow hover:bg-amber-50 focus-visible:ring-black dark:bg-neutral-700 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:ring-white placeholder-neutral-500 dark:placeholder-neutral-600"
          rows={3}
          aria-label={label}
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
        />
      </label>
      {helperText && <p className="text-gray-500 dark:text-gray-400 text-xs">{helperText}</p>}
    </div>
  );
};

export default Textarea;
