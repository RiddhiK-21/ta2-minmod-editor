import { Button, Flex, Input, Modal, Select, Space, Typography, Checkbox, Form, Tooltip } from "antd";
import _ from "lodash";
import { useStores, Commodity, IStore, Country, StateOrProvince, DepositType } from "models";
import { getFilterOptions, SiteFilter } from "models/dedupMineralSite";
import { InternalID, IRI } from "models/typing";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { routes } from "routes";
import { useQueryParams } from "gena-app";
import { observer } from "mobx-react-lite";
import styles from "./SearchBar.module.css";
import { AddFieldModal } from "../subpages/EditSetting";
import { SettingOutlined } from "@ant-design/icons";
import { DownloadButton } from "./DownloadDataButton";

interface SearchBarProps {
  searchArgs: SearchArgs;
  setSearchArgs: (args: SearchArgs) => void;
  onOpenNewMineralSiteForm: () => void;
  normSearchArgs: NormSearchArgs;
  // ids of the sites shown in the table, which is what the Download button saves
  visibleSiteIds: InternalID[];
  // when true, hide the controls that create or modify data (view-only pages)
  readonly?: boolean;
}

// option values for sites without a deposit type or without a country. No real deposit type or
// country has these names, so they can be stored in the URL like any other name.
export const UNKNOWN_DEPOSIT_TYPE = "Unknown";
export const BLANK_COUNTRY = "(blank)";

// the URL keeps one string per filter (repeated keys keep only the last value), so several
// values are joined with this. Some names contain commas, none contain "|".
const VALUE_SEPARATOR = "|";

interface SearchArgs {
  commodity?: string;
  depositTypes: string[];
  countries: string[];
  stateOrProvince?: string;
}

export interface NormSearchArgs {
  commodity?: Commodity;
  // null is the "Unknown" deposit type / the "(blank)" country
  depositTypes: (DepositType | null)[];
  countries: (Country | null)[];
  stateOrProvince?: StateOrProvince;
}

const splitValues = (value?: string): string[] => {
  return value === undefined ? [] : _.uniq(value.split(VALUE_SEPARATOR).filter((v) => v !== ""));
};

const joinValues = (values: string[]): string | undefined => {
  return values.length === 0 ? undefined : values.join(VALUE_SEPARATOR);
};

// true when the store is loaded and has no record with this name
const isUnknownName = (store: { records: Map<any, any>; getByName(name: string): any }, name: string) => {
  return store.records.size > 0 && (store.getByName(name) ?? null) === null;
};

export function getSiteFilter(normArgs: NormSearchArgs): SiteFilter {
  return {
    depositTypes: normArgs.depositTypes.map((depositType) => (depositType === null ? null : depositType.uri)),
    countries: normArgs.countries.map((country) => (country === null ? null : country.uri)),
    stateOrProvince: normArgs.stateOrProvince?.uri,
  };
}

export function useSearchArgs(): [SearchArgs, NormSearchArgs, (newArgs: SearchArgs) => void] {
  const { commodityStore, countryStore, stateOrProvinceStore, depositTypeStore } = useStores();
  const navigate = useNavigate();
  const queryParams = useQueryParams(routes.editor);

  const [args, setArgs] = useState<SearchArgs>({
    commodity: undefined,
    depositTypes: [],
    countries: [],
    stateOrProvince: undefined,
  });

  const updateSearchArgs = (newArgs: SearchArgs) => {
    setArgs(newArgs);
    routes.editor
      .path({
        queryArgs: {
          commodity: newArgs.commodity,
          depositType: joinValues(newArgs.depositTypes),
          stateOrProvince: newArgs.stateOrProvince,
          country: joinValues(newArgs.countries),
        },
      })
      .open(navigate);
  };

  // sync with queries in the URL
  useEffect(() => {
    const newArgs: SearchArgs = {
      commodity: queryParams?.commodity,
      depositTypes: splitValues(queryParams?.depositType).filter(
        (name) => name === UNKNOWN_DEPOSIT_TYPE || !isUnknownName(depositTypeStore, name)
      ),
      countries: splitValues(queryParams?.country).filter((name) => name === BLANK_COUNTRY || !isUnknownName(countryStore, name)),
      stateOrProvince: queryParams?.stateOrProvince,
    };

    if (newArgs.commodity !== undefined && isUnknownName(commodityStore, newArgs.commodity)) {
      newArgs.commodity = undefined;
    }

    if (newArgs.stateOrProvince !== undefined && isUnknownName(stateOrProvinceStore, newArgs.stateOrProvince)) {
      newArgs.stateOrProvince = undefined;
    }

    if (!_.isEqual(newArgs, args)) {
      updateSearchArgs(newArgs);
    }
  }, [
    commodityStore.records.size,
    depositTypeStore.records.size,
    countryStore.records.size,
    stateOrProvinceStore.records.size,
    queryParams?.commodity,
    queryParams?.depositType,
    queryParams?.country,
    queryParams?.stateOrProvince,
  ]);

  const normArgs: NormSearchArgs = useMemo(() => {
    const output: NormSearchArgs = {
      commodity: undefined,
      depositTypes: [],
      countries: [],
      stateOrProvince: undefined,
    };

    // wait till all stores are loaded to prevent firing multiple queries with partial conditions to the server
    if (commodityStore.records.size === 0 || depositTypeStore.records.size === 0 || countryStore.records.size === 0 || stateOrProvinceStore.records.size === 0) {
      return output;
    }

    // commodity is a required field
    if (args.commodity !== undefined) {
      const commodity = commodityStore.getByName(args.commodity);
      if (commodity !== null && commodity !== undefined) {
        output.commodity = commodity;
      }
    }

    for (const name of args.depositTypes) {
      const depositType = name === UNKNOWN_DEPOSIT_TYPE ? null : depositTypeStore.getByName(name);
      if (depositType !== undefined) {
        output.depositTypes.push(depositType);
      }
    }

    for (const name of args.countries) {
      const country = name === BLANK_COUNTRY ? null : countryStore.getByName(name);
      if (country !== undefined) {
        output.countries.push(country);
      }
    }

    if (args.stateOrProvince !== undefined) {
      const stateOrProvince = stateOrProvinceStore.getByName(args.stateOrProvince);
      if (stateOrProvince !== null && stateOrProvince !== undefined) {
        output.stateOrProvince = stateOrProvince;
      }
    }

    return output;
  }, [commodityStore.records.size, depositTypeStore.records.size, countryStore.records.size, stateOrProvinceStore.records.size, args]);

  return [args, normArgs, updateSearchArgs];
}

/**
 * Dropdown options for the given values, sorted by name with the "no value" option last.
 * Selected names that are no longer among the values stay in the list so they remain visible.
 */
const getOptions = (
  values: Set<IRI | null>,
  getByURI: (uri: IRI) => { name: string } | undefined,
  selected: string[],
  noValueName?: string
) => {
  const names = new Set<string>();
  let hasNoValue = false;
  for (const value of values) {
    if (value === null) {
      hasNoValue = true;
    } else {
      const name = getByURI(value)?.name;
      if (name !== undefined) names.add(name);
    }
  }
  for (const name of selected) {
    if (name === noValueName) {
      hasNoValue = true;
    } else {
      names.add(name);
    }
  }

  const options = Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
  if (hasNoValue && noValueName !== undefined) {
    options.push({ value: noValueName, label: noValueName });
  }
  return options;
};

// the multi-selects fold the chips that don't fit into "+ N ..."; hovering it lists those values
const renderOmittedValues = (omitted: { label?: React.ReactNode }[]) => (
  <Tooltip title={omitted.map((value) => value.label).join(", ")}>+ {omitted.length} ...</Tooltip>
);

export const SearchBar: React.FC<SearchBarProps> = observer(({ searchArgs, setSearchArgs, onOpenNewMineralSiteForm, normSearchArgs, visibleSiteIds, readonly }) => {
  const { commodityStore, countryStore, stateOrProvinceStore, depositTypeStore, settingStore, dedupMineralSiteStore } = useStores();

  const commodityOptions = useMemo(() => {
    return commodityStore.getCriticalCommodities().map((comm) => {
      return {
        value: comm.id,
        label: comm.name,
      };
    });
  }, [commodityStore.records.size]);

  // like the dashboard's Mineral Site tab, only offer values found in the commodity's sites
  const sites = normSearchArgs.commodity === undefined ? [] : dedupMineralSiteStore.getCacheSearchResult(normSearchArgs.commodity).records;
  const filterOptions = getFilterOptions(sites, getSiteFilter(normSearchArgs));

  const depositTypeOptions = getOptions(
    filterOptions.depositTypes,
    (uri) => depositTypeStore.getByURI(uri),
    searchArgs.depositTypes,
    UNKNOWN_DEPOSIT_TYPE
  );
  const countryOptions = getOptions(filterOptions.countries, (uri) => countryStore.getByURI(uri), searchArgs.countries, BLANK_COUNTRY);
  const stateOrProvinceOptions = getOptions(
    filterOptions.statesOrProvinces,
    (uri) => stateOrProvinceStore.getByURI(uri),
    searchArgs.stateOrProvince === undefined ? [] : [searchArgs.stateOrProvince]
  );

  return (
    <Flex gap="small" justify="space-between" align="center">
      <Space>
        <Typography.Text className={styles.label}>
          Commodity<span style={{ color: "red" }}>*</span>:
        </Typography.Text>
        <Select
          style={{ width: 200 }}
          value={searchArgs.commodity}
          placeholder="Select a commodity"
          showSearch={true}
          optionFilterProp="label"
          onChange={(id: string) =>
            setSearchArgs({
              ...searchArgs,
              commodity: commodityStore.get(id)!.name,
            })
          }
          options={commodityOptions}
        />
        <Typography.Text className={styles.label}>Deposit Type:</Typography.Text>
        <Select
          mode="multiple"
          style={{ width: 250 }}
          allowClear={true}
          value={searchArgs.depositTypes}
          placeholder="Select deposit types"
          showSearch={true}
          optionFilterProp="label"
          maxTagCount="responsive"
          maxTagPlaceholder={renderOmittedValues}
          onChange={(names: string[]) =>
            setSearchArgs({
              ...searchArgs,
              depositTypes: names,
            })
          }
          options={depositTypeOptions}
        />
        <Typography.Text className={styles.label}>Country:</Typography.Text>
        <Select
          mode="multiple"
          style={{ width: 200 }}
          allowClear={true}
          value={searchArgs.countries}
          placeholder="Select countries"
          showSearch={true}
          optionFilterProp="label"
          maxTagCount="responsive"
          maxTagPlaceholder={renderOmittedValues}
          onChange={(names: string[]) =>
            setSearchArgs({
              ...searchArgs,
              countries: names,
            })
          }
          options={countryOptions}
        />
        <Typography.Text className={styles.label}>State/Province:</Typography.Text>
        <Select
          style={{ width: 150 }}
          allowClear={true}
          value={searchArgs.stateOrProvince}
          placeholder="Select a state/province"
          showSearch={true}
          optionFilterProp="label"
          onChange={(name?: string) =>
            setSearchArgs({
              ...searchArgs,
              stateOrProvince: name,
            })
          }
          options={stateOrProvinceOptions}
        />
      </Space>
      <Space>
        {!readonly && (
          <Button type="primary" onClick={onOpenNewMineralSiteForm}>
            Add Mineral Site
          </Button>
        )}
        <Button type="primary" icon={<SettingOutlined />} onClick={() => settingStore.showSetting()}></Button>
        <AddFieldModal />
        <DownloadButton commodity={normSearchArgs.commodity} visibleSiteIds={visibleSiteIds} />
      </Space>
    </Flex>
  );
});
