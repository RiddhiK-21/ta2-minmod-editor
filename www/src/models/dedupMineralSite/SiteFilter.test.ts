import { EMPTY_SITE_FILTER, FilterableSite, filterSites, getFilterOptions, SiteFilter, splitCsvRecords } from "./SiteFilter";

interface TestSite extends FilterableSite {
  id: string;
}

const site = (id: string, depositType?: string, country: string[] = [], stateOrProvince: string[] = [], hasLocation = true): TestSite => ({
  id,
  getTop1DepositType: () => (depositType === undefined ? undefined : { uri: depositType }),
  location: hasLocation ? { country, stateOrProvince } : undefined,
});

const sites = [
  site("s1", "lct", ["us"], ["nevada"]),
  site("s2", "lct", ["ca"], ["quebec"]),
  site("s3", "simple", ["us"], ["nc"]),
  site("s4", undefined, ["au"]),
  site("s5", "brine", []),
  site("s6", "brine", [], [], false),
  site("s7", "simple", ["na", "za"]),
];

const ids = (filter: Partial<SiteFilter>) => filterSites(sites, { ...EMPTY_SITE_FILTER, ...filter }).map((s) => s.id);

describe("filterSites", () => {
  it("keeps every site when no filter is set", () => {
    expect(ids({})).toEqual(["s1", "s2", "s3", "s4", "s5", "s6", "s7"]);
  });

  it("matches any of the selected values within a filter", () => {
    expect(ids({ depositTypes: ["lct", "simple"] })).toEqual(["s1", "s2", "s3", "s7"]);
    expect(ids({ countries: ["us", "ca"] })).toEqual(["s1", "s2", "s3"]);
  });

  it("matches all filters together", () => {
    expect(ids({ depositTypes: ["lct"], countries: ["us"] })).toEqual(["s1"]);
    expect(ids({ depositTypes: ["simple"], stateOrProvince: "nc" })).toEqual(["s3"]);
  });

  it("matches sites without a deposit type or a country with null", () => {
    expect(ids({ depositTypes: [null] })).toEqual(["s4"]);
    expect(ids({ countries: [null] })).toEqual(["s5", "s6"]);
    expect(ids({ countries: [null, "au"] })).toEqual(["s4", "s5", "s6"]);
  });

  it("matches a site with several countries on any of them", () => {
    expect(ids({ countries: ["za"] })).toEqual(["s7"]);
    expect(ids({ countries: ["na"] })).toEqual(["s7"]);
  });
});

describe("getFilterOptions", () => {
  it("lists the values of the commodity's sites, with null for missing ones", () => {
    const options = getFilterOptions(sites, EMPTY_SITE_FILTER);
    expect(options.depositTypes).toEqual(new Set(["lct", "simple", null, "brine"]));
    expect(options.countries).toEqual(new Set(["us", "ca", "au", null, "na", "za"]));
    expect(options.statesOrProvinces).toEqual(new Set(["nevada", "quebec", "nc"]));
  });

  it("narrows countries by deposit type, but not deposit types by country", () => {
    const options = getFilterOptions(sites, { ...EMPTY_SITE_FILTER, depositTypes: ["lct"], countries: ["us"] });
    expect(options.depositTypes).toEqual(new Set(["lct", "simple", null, "brine"]));
    expect(options.countries).toEqual(new Set(["us", "ca"]));
    expect(options.statesOrProvinces).toEqual(new Set(["nevada"]));
  });

  it("restores the full country list when the deposit types are cleared", () => {
    expect(getFilterOptions(sites, { ...EMPTY_SITE_FILTER, depositTypes: [] }).countries).toEqual(
      getFilterOptions(sites, EMPTY_SITE_FILTER).countries
    );
  });
});

describe("splitCsvRecords", () => {
  it("keeps commas and line breaks inside quoted fields", () => {
    const text = 'URI,Name,Country\nhttp://x/a,"Mine, North","Namibia, South Africa"\nhttp://x/b,"Two\nlines ""quoted""",US\n';
    expect(splitCsvRecords(text)).toEqual([
      "URI,Name,Country",
      'http://x/a,"Mine, North","Namibia, South Africa"',
      'http://x/b,"Two\nlines ""quoted""",US',
    ]);
  });

  it("handles CRLF line endings and a missing final newline", () => {
    expect(splitCsvRecords("a,b\r\n1,2\r\n3,4")).toEqual(["a,b", "1,2", "3,4"]);
  });
});
