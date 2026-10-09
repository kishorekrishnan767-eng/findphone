import { Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { env } from '../../../config/env';
import { Button } from '../../../design-system/components/Button';
import { PhoneInput } from '../../../design-system/components/PhoneInput';
import { countryByIso } from '../../../shared/phone/countries';

export function SearchForm({
  onSearch,
  error,
  busy,
}: {
  onSearch: (input: string, countryIso: string) => void;
  error: string | null;
  busy: boolean;
}) {
  const [country, setCountry] = useState(() => countryByIso(env.defaultCountry));
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(value, country.iso);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" role="search" aria-label="Find a phone by number">
      <PhoneInput
        label="Mobile number"
        country={country}
        onCountryChange={setCountry}
        value={value}
        onChange={setValue}
        error={error}
      />
      <Button type="submit" icon={Search} loading={busy} block>
        Search
      </Button>
    </form>
  );
}
