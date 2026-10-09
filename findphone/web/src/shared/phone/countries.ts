import { countriesData as data } from '../../generated/shared';

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

export const countries = data.countries as unknown as Country[];

const byIso = new Map(countries.map((c) => [c.iso, c]));

export const defaultCountryIso = data.defaultCountry;

export function countryByIso(iso: string): Country {
  return byIso.get(iso.toUpperCase()) ?? byIso.get(defaultCountryIso)!;
}
