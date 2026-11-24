import { IRI } from "../typing";

/**
 * Filter applied in the browser to the sites of a commodity. Within a filter, a site matches
 * if it matches any of the selected values; between filters, it must match all of them.
 *
 * `null` stands for "no value": a site without a deposit type, or without a country.
 * An empty list means the filter is not set.
 */
export interface SiteFilter {
  depositTypes: (IRI | null)[];
  countries: (IRI | null)[];
  stateOrProvince?: IRI;
}

// the part of a DedupMineralSite that the filter reads
export interface FilterableSite {
  getTop1DepositType(): { uri: IRI } | undefined;
  location?: { country: IRI[]; stateOrProvince: IRI[] };
}

export interface FilterOptions {
  depositTypes: Set<IRI | null>;
  countries: Set<IRI | null>;
  statesOrProvinces: Set<IRI>;
}

export const EMPTY_SITE_FILTER: SiteFilter = { depositTypes: [], countries: [] };

const getDepositType = (site: FilterableSite): IRI | null => site.getTop1DepositType()?.uri ?? null;
const getCountries = (site: FilterableSite): IRI[] => site.location?.country ?? [];
const getStatesOrProvinces = (site: FilterableSite): IRI[] => site.location?.stateOrProvince ?? [];

export function matchDepositTypes(site: FilterableSite, depositTypes: (IRI | null)[]): boolean {
  return depositTypes.length === 0 || depositTypes.includes(getDepositType(site));
}

export function matchCountries(site: FilterableSite, countries: (IRI | null)[]): boolean {
  if (countries.length === 0) return true;
  const siteCountries = getCountries(site);
  if (siteCountries.length === 0) return countries.includes(null);
  // a site with several countries matches any of them, the same as the server filter
  return siteCountries.some((country) => countries.includes(country));
}

export function matchStateOrProvince(site: FilterableSite, stateOrProvince?: IRI): boolean {
  return stateOrProvince === undefined || getStatesOrProvinces(site).includes(stateOrProvince);
}

export function matchSite(site: FilterableSite, filter: SiteFilter): boolean {
  return (
    matchDepositTypes(site, filter.depositTypes) &&
    matchCountries(site, filter.countries) &&
    matchStateOrProvince(site, filter.stateOrProvince)
  );
}

export function filterSites<T extends FilterableSite>(sites: T[], filter: SiteFilter): T[] {
  return sites.filter((site) => matchSite(site, filter));
}

/**
 * Values offered in the dropdowns, taken from the commodity's sites. Deposit types are never
 * narrowed; countries are narrowed by the selected deposit types; states or provinces are
 * narrowed by the selected deposit types and countries.
 */
export function getFilterOptions(sites: FilterableSite[], filter: SiteFilter): FilterOptions {
  const options: FilterOptions = { depositTypes: new Set(), countries: new Set(), statesOrProvinces: new Set() };

  for (const site of sites) {
    options.depositTypes.add(getDepositType(site));

    if (!matchDepositTypes(site, filter.depositTypes)) continue;
    const countries = getCountries(site);
    if (countries.length === 0) {
      options.countries.add(null);
    } else {
      countries.forEach((country) => options.countries.add(country));
    }

    if (!matchCountries(site, filter.countries)) continue;
    getStatesOrProvinces(site).forEach((sop) => options.statesOrProvinces.add(sop));
  }

  return options;
}

/**
 * Split CSV text into its raw records (header first), keeping each record's text unchanged.
 * Commas and line breaks inside quoted fields do not end a record.
 */
export function splitCsvRecords(text: string): string[] {
  const records: string[] = [];
  let inQuotes = false;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // an escaped quote ("") toggles twice, so it leaves the state unchanged
      inQuotes = !inQuotes;
    } else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      records.push(text.substring(start, i));
      if (ch === "\r" && text[i + 1] === "\n") i++;
      start = i + 1;
    }
  }
  if (start < text.length) {
    records.push(text.substring(start));
  }

  return records.filter((record) => record.length > 0);
}
