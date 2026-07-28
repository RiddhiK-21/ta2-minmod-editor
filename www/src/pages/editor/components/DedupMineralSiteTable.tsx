import { Country, DedupMineralSite, DepositType, StateOrProvince, useStores } from "models";
import { useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { Commodity } from "models/commodity";
import {
  Button,
  Checkbox,
  Divider,
  Flex,
  Input,
  InputRef,
  Space,
  Table,
  TableColumnType,
  TableColumnsType,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CheckOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UngroupOutlined,
} from "@ant-design/icons";
import { EditDedupMineralSite } from "./edit-dedup-site/EditDedupMineralSite";
import { Entity } from "components/Entity";
import { ContainedMetal, Empty, Grade, MayEmptyString, Tonnage } from "components/Primitive";
import { filter } from "lodash";
import { FilterDropdownProps } from "antd/es/table/interface";
import Highlighter from "react-highlight-words";
import Fuse from "fuse.js";
import styles from "./DedupMineralSiteTable.module.css";
import { FormattedDedupMineralSite, useFormattedDedupMineralSite } from "../hooks/formattedDedupmineralsite";
import { ConfirmDataButton } from "./ConfirmDataButton";

interface DedupMineralSiteTableProps {
  commodity?: Commodity;
  depositType?: DepositType;
  country?: Country;
  stateOrProvince?: StateOrProvince;
}

const emptyFetchResult = { records: [], total: 0 };

const getUniqueType = (sites: DedupMineralSite[]) => {
  const values = new Set<string>();
  sites.forEach((site) => {
    if (site.type !== undefined) {
      values.add(site.type);
    }
  });
  return Array.from(values);
};

const getUniqueRank = (sites: DedupMineralSite[]) => {
  const values = new Set<string>();
  sites.forEach((site) => {
    if (site.rank !== undefined) {
      values.add(site.rank);
    }
  });
  return Array.from(values);
};

export const DedupMineralSiteTable: React.FC<DedupMineralSiteTableProps> = observer(
  ({ commodity, depositType, country, stateOrProvince }) => {
    const { dedupMineralSiteStore, depositTypeStore, countryStore, stateOrProvinceStore, settingStore } = useStores();
    const [editingDedupSite, setEditingDedupSite] = useState<string | undefined>(undefined);
    const [selectedDedupSiteIds, setSelectedDedupSiteIds] = useState<Set<string>>(new Set());

    const [nameSearchText, nameFilterFn, nameFilterProps] = useTextSearch("name");
    const [typeSearchText, typeFilterFn, typeFilterProps] = useTextSearch("type");
    const [rankSearchText, rankFilterFn, rankFilterProps] = useTextSearch("rank");

    useEffect(() => {
      if (commodity !== undefined) {
        dedupMineralSiteStore.searchAndCache(commodity, depositType, country, stateOrProvince);
      }
    }, [commodity, depositType, country, stateOrProvince]);

    const isLoading = dedupMineralSiteStore.state.value === "updating";
    const dedupMineralSites =
      commodity === undefined
        ? emptyFetchResult
        : dedupMineralSiteStore.getCacheSearchResult(commodity, depositType, country, stateOrProvince);

    const filteredDedupMineralSites = useMemo(() => {
      let lstdms = dedupMineralSites.records;
      if (nameFilterFn !== undefined) {
        lstdms = nameFilterFn(lstdms);
      }
      if (typeFilterFn !== undefined) {
        lstdms = typeFilterFn(lstdms);
      }
      if (rankFilterFn !== undefined) {
        lstdms = rankFilterFn(lstdms);
      }
      return { records: lstdms, total: dedupMineralSites.total };
    }, [dedupMineralSites, nameFilterFn, typeFilterFn, rankFilterFn]);

    const allFormattedList = useFormattedDedupMineralSite(filteredDedupMineralSites.records);

    const scrollX = settingStore.displayColumns.size > 0;

    let columns = useMemo(() => {
      let extraColumns: TableColumnsType<FormattedDedupMineralSite> = [];
      if (settingStore.displayColumns.has("mineral_form")) {
        extraColumns.push({
          title: "Mineral Form",
          key: "mineralForm",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.mineral_form;
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <MayEmptyString value={site.origin.mineralForm.join(", ")} />
              </div>
            );
          },
        });
      }

      if (settingStore.displayColumns.has("geology_info")) {
        extraColumns = extraColumns.concat([
          {
            title: "Alteration",
            key: "alteration",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.alteration;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.alteration} />
                </div>
              );
            },
          },
          {
            title: "Concentration Process",
            key: "concentrationProcess",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.concentrationProcess;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.concentrationProcess} />
                </div>
              );
            },
          },
          {
            title: "Ore Control",
            key: "oreControl",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.oreControl;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.oreControl} />
                </div>
              );
            },
          },
          {
            title: "Host Rock Unit",
            key: "hostRockUnit",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.hostRock.unit;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.hostRock?.unit} />
                </div>
              );
            },
          },
          {
            title: "Host Rock Type",
            key: "hostRockType",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.hostRock.type;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.hostRock?.type} />
                </div>
              );
            },
          },
          {
            title: "Associated Rock Unit",
            key: "associatedRockUnit",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.associatedRock.unit;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.associatedRock?.unit} />
                </div>
              );
            },
          },
          {
            title: "Associated Rock Type",
            key: "associatedRockType",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.associatedRock.type;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.associatedRock?.type} />
                </div>
              );
            },
          },
          {
            title: "Structure",
            key: "structure",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.structure;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.structure} />
                </div>
              );
            },
          },
          {
            title: "Tectonic",
            key: "tectonic",
            render: (_: any, site: FormattedDedupMineralSite) => {
              const isEdited = site.isEdited.geology_info.tectonic;
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <MayEmptyString value={site.origin.geologyInfo?.tectonic} />
                </div>
              );
            },
          },
        ]);
      }

      if (settingStore.displayColumns.has("discover_year")) {
        extraColumns.push({
          title: "Discovery Year",
          key: "discoveryYear",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.discovered_year;
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <MayEmptyString value={site.origin.discoveredYear} />
              </div>
            );
          },
        });
      }

      const cols: TableColumnsType<FormattedDedupMineralSite> = [
        {
          title: "Name",
          dataIndex: "name",
          key: "name",
          ...nameFilterProps,
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.name;
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <Typography.Link href={`/derived/${site.origin.id}`} target="_blank">
                {/*<Typography.Link href={site.origin.uri} target="_blank">*/}
                {/* site.origin.uri is already the full https://minmod.isi.edu/derived/{id} URL; the relative path above resolved against localhost instead of the hosted API */}
                  <Highlight text={site.origin.name || "␣"} searchText={nameSearchText} />
                </Typography.Link>
                &nbsp;
                <Typography.Text type="secondary" className="font-small" title="Number of duplicated mineral sites">
                  #{site.origin.sites.length}
                </Typography.Text>
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) =>
            a.origin.name.localeCompare(b.origin.name),
        },
        {
          title: "Type",
          key: "type",
          ...typeFilterProps,
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.type;
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <span className="font-small">
                  <Highlight text={site.origin.type} searchText={typeSearchText} />
                </span>
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) =>
            a.origin.type.localeCompare(b.origin.type),
        },
        {
          title: "Rank",
          key: "rank",
          ...rankFilterProps,
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.rank;
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <span className="font-small">
                  <Highlight text={site.origin.rank} searchText={rankSearchText} />
                </span>
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) =>
            a.origin.rank.localeCompare(b.origin.rank),
        },
        {
          title: "Location",
          key: "location",
          render: (value: any, dedupSite: FormattedDedupMineralSite) => {
            const isEdited = dedupSite.isEdited.coordinates;
            if (
              dedupSite.origin.location !== undefined &&
              dedupSite.origin.location.lat !== undefined &&
              dedupSite.origin.location.lon !== undefined
            ) {
              return (
                <div className={isEdited ? styles.cellHighlight : ""}>
                  <Typography.Link
                    href={`http://maps.google.com/maps?z=12&t=m&q=loc:${dedupSite.origin.location.lat}+${dedupSite.origin.location.lon}`}
                    target="_blank"
                  >
                    {`${dedupSite.origin.location.lat.toFixed(5)}, ${dedupSite.origin.location.lon.toFixed(5)}`}
                  </Typography.Link>
                </div>
              );
            }
            return <Empty />;
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) => {
            const locA = a.origin.location
              ? `${a.origin.location.lat?.toFixed(3)},${a.origin.location.lon?.toFixed(3)}`
              : "";
            const locB = b.origin.location
              ? `${b.origin.location.lat?.toFixed(3)},${b.origin.location.lon?.toFixed(3)}`
              : "";
            return locA.localeCompare(locB);
          },
        },
        {
          title: "Country",
          key: "country",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.country;
            if (site.origin.location === undefined || site.origin.location.country.length === 0) {
              return <Empty />;
            }

            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <Space split={<Divider type="vertical" />}>
                  {site.origin.location.country.map((country) => (
                    <Entity key={country} uri={country} store="countryStore" />
                  ))}
                </Space>
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) => {
            const countryA = a.origin.location?.country.map((iri) => countryStore.getByURI(iri)!.name).join(",") || "";
            const countryB = b.origin.location?.country.map((iri) => countryStore.getByURI(iri)!.name).join(",") || "";
            return countryA.localeCompare(countryB);
          },
        },
        {
          title: "State/Province",
          key: "state",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.state_or_province;
            if (site.origin.location === undefined || site.origin.location.stateOrProvince.length === 0) {
              return <Empty />;
            }

            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <Space split={<Divider type="vertical" />}>
                  {site.origin.location.stateOrProvince.map((province) => (
                    <Entity key={province} uri={province} store="stateOrProvinceStore" />
                  ))}
                </Space>
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) => {
            const stateA =
              a.origin.location?.stateOrProvince.map((iri) => stateOrProvinceStore.getByURI(iri)!.name).join(",") || "";
            const stateB =
              b.origin.location?.stateOrProvince.map((iri) => stateOrProvinceStore.getByURI(iri)!.name).join(",") || "";
            return stateA.localeCompare(stateB);
          },
        },
        {
          title: "Deposit Type",
          key: "depositType",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const dt = site.origin.getTop1DepositType();
            if (dt === undefined) {
              return <Empty />;
            }
            const isEdited = site.isEdited.deposit_types[0];
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <Entity uri={dt.uri} store="depositTypeStore" />
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) => {
            const dtA = a.origin.getTop1DepositType()?.uri;
            const dtB = b.origin.getTop1DepositType()?.uri;
            const dtAName = dtA !== undefined ? depositTypeStore.getByURI(dtA)!.name : "";
            const dtBName = dtB !== undefined ? depositTypeStore.getByURI(dtB)!.name : "";
            return dtAName.localeCompare(dtBName);
          },
        },
        {
          title: "Dep. Score",
          key: "depositConfidence",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const dt = site.origin.getTop1DepositType();
            if (dt === undefined) {
              return <Empty />;
            }
            const isEdited = site.isEdited.deposit_types[0];
            return <div className={isEdited ? styles.cellHighlight : ""}>{dt.confidence.toFixed(4)}</div>;
          },
        },
        {
          title: "Tonnage (Mt)",
          dataIndex: "totalTonnage",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.grade_tonnage.some((gt) => gt.commodity == commodity?.id && gt.isEdited);
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <Tonnage tonnage={site.origin.gradeTonnage?.totalTonnage} />
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) => {
            const tonnageA = a.origin.gradeTonnage?.totalTonnage || 0;
            const tonnageB = b.origin.gradeTonnage?.totalTonnage || 0;
            return tonnageA - tonnageB;
          },
        },
        {
          title: "Grade (%)",
          dataIndex: "totalGrade",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.grade_tonnage.some((gt) => gt.commodity == commodity?.id && gt.isEdited);
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <Grade grade={site.origin.gradeTonnage?.totalGrade} />
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) => {
            const gradeA = a.origin.gradeTonnage?.totalGrade || 0;
            const gradeB = b.origin.gradeTonnage?.totalGrade || 0;
            return gradeA - gradeB;
          },
        },
        {
          title: "Contained Metal (tonnes)",
          key: "totalContainedMetal",
          render: (_: any, site: FormattedDedupMineralSite) => {
            const isEdited = site.isEdited.grade_tonnage.some((gt) => gt.commodity == commodity?.id && gt.isEdited);
            return (
              <div className={isEdited ? styles.cellHighlight : ""}>
                <ContainedMetal
                  tonnage={site.origin.gradeTonnage?.totalTonnage}
                  grade={site.origin.gradeTonnage?.totalGrade}
                />
              </div>
            );
          },
          sorter: (a: FormattedDedupMineralSite, b: FormattedDedupMineralSite) => {
            const tonnageA = a.origin.gradeTonnage?.totalTonnage || 0;
            const tonnageB = b.origin.gradeTonnage?.totalTonnage || 0;

            const gradeA = a.origin.gradeTonnage?.totalGrade || 0;
            const gradeB = b.origin.gradeTonnage?.totalGrade || 0;
            return tonnageA * gradeA - tonnageB * gradeB;
          },
        },
        ...extraColumns,
        {
          title: "Action",
          key: "action",
          render: (_: any, site: FormattedDedupMineralSite) => {
            return (
              <Space direction="horizontal">
                <Button
                  color="primary"
                  size="middle"
                  icon={<EditOutlined />}
                  variant="filled"
                  onClick={() => {
                    if (site.origin.id === editingDedupSite) {
                      setEditingDedupSite(undefined);
                    } else {
                      setEditingDedupSite(site.origin.id);
                    }
                  }}
                >
                  Edit
                </Button>
                <ConfirmDataButton dedupSite={site.origin} commodity={commodity!} />
              </Space>
            );
          },
        },
      ];

      if (scrollX) {
        cols[0].fixed = "left";
        cols[1].fixed = "left";
        cols[cols.length - 1].fixed = "right";
      }

      return cols;
    }, [
      commodity,
      depositTypeStore,
      countryStore,
      stateOrProvinceStore,
      editingDedupSite,
      settingStore.displayColumns,
      nameSearchText,
      typeSearchText,
      rankSearchText,
      scrollX,
    ]);

    const toggleSelectSite = (site: FormattedDedupMineralSite) => {
      const newSelectedDedupSiteIds = new Set(selectedDedupSiteIds);
      if (selectedDedupSiteIds.has(site.origin.id)) {
        newSelectedDedupSiteIds.delete(site.origin.id);
      } else {
        newSelectedDedupSiteIds.add(site.origin.id);
      }
      setSelectedDedupSiteIds(newSelectedDedupSiteIds);
    };

    columns = [
      {
        title: "",
        key: "group",
        render: (_: any, site: FormattedDedupMineralSite) => (
          <Checkbox
            type="primary"
            checked={selectedDedupSiteIds.has(site.origin.id)}
            onClick={() => toggleSelectSite(site)}
          />
        ),
        fixed: scrollX ? "left" : undefined,
      },
      ...columns,
    ];

    const handleGroup = async () => {
      const prevIds = Array.from(selectedDedupSiteIds);
      const allSiteIds = Array.from(selectedDedupSiteIds).flatMap((dedupSiteId) =>
        dedupMineralSiteStore.get(dedupSiteId)!.sites.map((site) => site.id)
      );

      const newSiteGroups = [
        {
          sites: allSiteIds,
        },
      ];
      const newIds = await dedupMineralSiteStore.updateSameAsGroup(newSiteGroups);
      if (commodity && commodity.id) {
        const commodityId = commodity.id;
        message.success("Grouping was successful", 3);
        setSelectedDedupSiteIds(new Set());
        await dedupMineralSiteStore.replaceSites(prevIds, newIds, commodityId);
      }
    };

    const selectedDedupSites = useMemo(() => {
      return Array.from(selectedDedupSiteIds)
        .map((id) => allFormattedList.find((f) => f.origin.id === id))
        .filter((site): site is FormattedDedupMineralSite => site !== undefined);
    }, [selectedDedupSiteIds, allFormattedList]);

    return (
      <>
        {selectedDedupSites.length > 0 ? (
          <>
            <div>
              <Button
                type="primary"
                onClick={handleGroup}
                disabled={selectedDedupSiteIds.size === 1 || isLoading}
                loading={isLoading}
              >
                Group selected sites
              </Button>
            </div>
            <Table<FormattedDedupMineralSite>
              loading={isLoading ? { size: "large" } : false}
              bordered={true}
              size="small"
              rowKey={(site) => site.origin.id}
              pagination={false}
              columns={columns}
              showSorterTooltip={false}
              dataSource={selectedDedupSites}
            />
          </>
        ) : (
          <></>
        )}
        {/* <Flex vertical={true} gap="small" style={scrollX ? { width: "calc(100vw - 44px - 44px)" } : {}}> */}
        <Table<FormattedDedupMineralSite>
          bordered={true}
          size="small"
          rowKey={(site) => site.origin.id}
          columns={columns}
          dataSource={allFormattedList}
          loading={isLoading ? { size: "large" } : false}
          showSorterTooltip={false}
          expandable={{
            expandedRowRender: (site) => {
              if (editingDedupSite === site.origin.id) {
                return <EditDedupMineralSite commodity={commodity!} dedupSite={site.origin} />;
              }
              return null;
            },
            showExpandColumn: false,
            expandedRowKeys: [...(editingDedupSite ? [editingDedupSite] : [])],
          }}
          scroll={scrollX ? { x: "max-content" } : undefined}
        />
        {/* </Flex> */}
      </>
    );
  }
);

const Highlight = ({ text, searchText }: { text: string; searchText: string }) => {
  if (searchText.length > 0) {
    return (
      <Highlighter
        highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
        searchWords={searchText.split(" ")}
        autoEscape
        textToHighlight={text}
      />
    );
  }
  return <>{text}</>;
};

const useTextSearch = (
  property: "name" | "type" | "rank"
): [
  string,
  ((dms: DedupMineralSite[]) => DedupMineralSite[]) | undefined,
  TableColumnType<FormattedDedupMineralSite>
] => {
  const [searchText, setSearchText] = useState("");
  const searchInput = useRef<InputRef>(null);

  // somehow handle reset doesn't work. It doesn't disable the filter mode and the filter icon is still colored
  // if we pass selectedKeys as empty array, it will reset the filter mode
  const handleSearch = (selectedKeys: string[], confirm: FilterDropdownProps["confirm"]) => {
    confirm();
    setSearchText(selectedKeys[0] || "");
  };

  const columnProps = {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${property}`}
          value={selectedKeys[0]}
          allowClear={true}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onClear={() => handleSearch([], confirm)}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm)}
          style={{ width: 200 }}
        />
      </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />,
    filterDropdownProps: {
      onOpenChange(open: boolean) {
        if (open) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      },
    },
  };

  const filterFn = useMemo(() => {
    let filterFn = undefined;
    if (searchText !== "") {
      if (property === "rank" || property === "type") {
        const query = searchText.toLowerCase();
        filterFn = (lst: DedupMineralSite[]) => {
          return filter(lst, (site) => {
            return (site[property] || "").toLowerCase().includes(query);
          });
        };
      } else {
        filterFn = (lst: DedupMineralSite[]) => {
          const fuse = new Fuse(lst, {
            minMatchCharLength: 2,
            keys: [property],
          });
          return fuse.search(searchText).map((r) => r.item);
        };
      }
    }
    return filterFn;
  }, [searchText]);

  return [searchText, filterFn, columnProps];
};
