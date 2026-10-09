import data from '../../../../shared/countries.json';

export interface Country {
  iso: string;
  name: string;
  dialCode: string;
  trunkPrefix: string | null;
  nationalLength: [number, number];
  mobilePattern: string;
  groups: number[];
  example: string;
}

export const countries = data.countries as Country[];

const byIso = new Map(countries.map((c) => [c.iso, c]));

export const defaultCountryIso = data.defaultCountry;

export function countryByIso(iso: string): Country {
  return byIso.get(iso.toUpperCase()) ?? byIso.get(defaultCountryIso)!;
}
