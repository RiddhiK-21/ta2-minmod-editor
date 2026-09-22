import { Button, Flex, Input, Modal, Select, Space, Typography, Checkbox, Form } from "antd";
import _ from "lodash";
import { useStores, Commodity, IStore, Country, StateOrProvince, DepositType } from "models";
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
  onOpenNewMineralSiteForm?: () => void;
  normSearchArgs: NormSearchArgs;
  // when true, hide the controls that create or modify data (view-only pages)
  readonly?: boolean;
}

interface SearchArgs {
  commodity?: string;
  depositType?: string;
  country?: string;
  stateOrProvince?: string;
}

export interface NormSearchArgs {
  commodity?: Commodity;
  depositType?: DepositType;
  country?: Country;
  stateOrProvince?: StateOrProvince;
}

// the page that owns the search bar -- either routes.editor or routes.viewer, which share the same query schema
export type SearchRoute = typeof routes.editor;

export function useSearchArgs(route: SearchRoute): [SearchArgs, NormSearchArgs, (newArgs: SearchArgs) => void] {
  const { commodityStore, countryStore, stateOrProvinceStore, depositTypeStore } = useStores();
  const navigate = useNavigate();
  const queryParams = useQueryParams(route);

  const [args, setArgs] = useState<SearchArgs>({
    commodity: undefined,
    depositType: undefined,
    country: undefined,
    stateOrProvince: undefined,
  });

  const updateSearchArgs = (newArgs: SearchArgs) => {
    setArgs(newArgs);
    route
      .path({
        queryArgs: {
          commodity: newArgs.commodity,
          depositType: newArgs.depositType,
          stateOrProvince: newArgs.stateOrProvince,
          country: newArgs.country,
        },
      })
      .open(navigate);
  };

  // sync with queries in the URL
  useEffect(() => {
    const newArgs = {
      commodity: queryParams?.commodity,
      depositType: queryParams?.depositType,
      country: queryParams?.country,
      stateOrProvince: queryParams?.stateOrProvince,
    };

    if (newArgs.commodity !== undefined) {
      const commodity = commodityStore.getByName(newArgs.commodity);
      if (commodity === null) {
        // does not exist
        newArgs.commodity = undefined;
      }
    }

    if (newArgs.depositType !== undefined) {
      const depositType = depositTypeStore.getByName(newArgs.depositType);
      if (depositType === null) {
        // does not exist
        newArgs.depositType = undefined;
      }
    }

    if (newArgs.country !== undefined) {
      const country = countryStore.getByName(newArgs.country);
      if (country === null) {
        // does not exist
        newArgs.country = undefined;
      }
    }

    if (newArgs.stateOrProvince !== undefined) {
      const stateOrProvince = stateOrProvinceStore.getByName(newArgs.stateOrProvince);
      if (stateOrProvince === null) {
        // does not exist
        newArgs.stateOrProvince = undefined;
      }
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
      depositType: undefined,
      country: undefined,
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

    if (args.depositType !== undefined) {
      const depositType = depositTypeStore.getByName(args.depositType);
      if (depositType !== null && depositType !== undefined) {
        output.depositType = depositType;
      }
    }

    if (args.country !== undefined) {
      const country = countryStore.getByName(args.country);
      if (country !== null && country !== undefined) {
        output.country = country;
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

export const SearchBar: React.FC<SearchBarProps> = observer(({ searchArgs, setSearchArgs, onOpenNewMineralSiteForm, normSearchArgs, readonly }) => {
  const { commodityStore, countryStore, stateOrProvinceStore, depositTypeStore, settingStore } = useStores();

  const commodityOptions = useMemo(() => {
    return commodityStore.getCriticalCommodities().map((comm) => {
      return {
        value: comm.id,
        label: comm.name,
      };
    });
  }, [commodityStore.records.size]);

  const depositTypeOptions = useMemo(() => {
    return depositTypeStore.list.map((ent) => {
      return {
        value: ent.id,
        label: ent.name,
      };
    });
  }, [depositTypeStore.records.size]);

  const countryOptions = useMemo(() => {
    return countryStore.list.map((ent) => {
      return {
        value: ent.id,
        label: ent.name,
      };
    });
  }, [countryStore.records.size]);

  const stateOrProvinceOptions = useMemo(() => {
    return stateOrProvinceStore.list.map((ent) => {
      return {
        value: ent.id,
        label: ent.name,
      };
    });
  }, [stateOrProvinceStore.records.size]);

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
          style={{ width: 200 }}
          allowClear={true}
          value={searchArgs.depositType}
          placeholder="Select a deposit type"
          showSearch={true}
          optionFilterProp="label"
          onChange={(id?: string) =>
            setSearchArgs({
              ...searchArgs,
              depositType: id === undefined ? undefined : depositTypeStore.get(id)!.name,
            })
          }
          options={depositTypeOptions}
        />
        <Typography.Text className={styles.label}>Country:</Typography.Text>
        <Select
          style={{ width: 150 }}
          allowClear={true}
          value={searchArgs.country}
          placeholder="Select a country"
          showSearch={true}
          optionFilterProp="label"
          onChange={(id?: string) =>
            setSearchArgs({
              ...searchArgs,
              country: id === undefined ? undefined : countryStore.get(id)!.name,
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
          onChange={(id?: string) =>
            setSearchArgs({
              ...searchArgs,
              stateOrProvince: id === undefined ? undefined : stateOrProvinceStore.get(id)!.name,
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
        <DownloadButton normSearchArgs={normSearchArgs} />
      </Space>
    </Flex>
  );
});
