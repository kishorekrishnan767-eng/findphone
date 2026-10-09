import { CircleAlert, ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { type Country, countries } from '../../shared/phone/countries';
import { formatNational } from '../../shared/phone/normalize';
import { cn } from '../cn';

/**
 * One visual field: `+91 ▾` (a native select, so it's keyboard- and screen-reader friendly) and
 * the national number. No flags. Errors show below with an icon and are tied via aria-describedby.
 */
export function PhoneInput({
  label,
  country,
  onCountryChange,
  value,
  onChange,
  error,
  helper,
  inputRef,
}: {
  label: string;
  country: Country;
  onCountryChange: (c: Country) => void;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  helper?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = useId();
  const messageId = `${id}-msg`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-number`} className="text-label text-primary">
        {label}
      </label>
      <div
        className={cn(
          'flex h-11 items-stretch overflow-hidden rounded-md border bg-surface transition-colors duration-150 ease-standard',
          error ? 'border-danger-text' : 'border-line-control',
          'focus-within:outline-2 focus-within:-outline-offset-1',
          error ? 'focus-within:outline-danger-text' : 'focus-within:outline-accent',
        )}
      >
        <div className="relative flex items-center gap-1 border-r border-line pr-2 pl-3">
          <span aria-hidden className="font-mono text-mono text-primary">
            +{country.dialCode}
          </span>
          <ChevronDown aria-hidden size={16} className="text-secondary" />
          <select
            aria-label="Country code"
            value={country.iso}
            onChange={(e) => onCountryChange(countries.find((c) => c.iso === e.target.value) ?? country)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {countries.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name} (+{c.dialCode})
              </option>
            ))}
          </select>
        </div>
        <input
          ref={inputRef}
          id={`${id}-number`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={formatNational(country.example, country)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helper ? messageId : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 font-mono text-mono text-primary outline-none placeholder:text-tertiary"
        />
      </div>
      {error ? (
        <p id={messageId} className="flex items-start gap-2 text-caption text-danger-text" aria-live="polite">
          <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="shrink-0" />
          {error}
        </p>
      ) : (
        helper && (
          <p id={messageId} className="text-caption text-tertiary">
            {helper}
          </p>
        )
      )}
    </div>
  );
}
