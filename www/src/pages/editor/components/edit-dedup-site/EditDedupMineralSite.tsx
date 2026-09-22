import { Button, Flex, Space, Table, Typography, message, Checkbox, Tag, Descriptions, TableColumnsType } from "antd";
import { observer } from "mobx-react-lite";
import { useStores, Commodity, DedupMineralSite, MineralSite, EditableField } from "models";
import { useEffect, useMemo, useState } from "react";
import { CanEntComponent, ListCanEntComponent } from "../CandidateEntity";
import { EditOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { EditSiteField } from "./EditSiteField";
import styles from "./EditDedupMineralSite.module.css";
import { Tooltip } from "antd";
import { ReferenceComponent } from "pages/editor/components/edit-dedup-site/ReferenceComponent";
import { InternalID } from "models/typing";
import { ContainedMetal, Empty, Grade, MayEmptyString, Tonnage } from "components/Primitive";
import { CommodityList } from "../CommodityList";

const colors = ["magenta", "red", "volcano", "orange", "gold", "lime", "green", "cyan", "blue", "geekblue", "purple"];
const getUserColor = (username: string) => {
  let hash = 1;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return colors[hash % colors.length];
};

interface EditDedupMineralSiteProps {
  commodity: Commodity;
  dedupSite: DedupMineralSite;
  // when true, render the same table without any edit affordance (no pencils, no ungrouping, no edit modal)
  readonly?: boolean;
}

class GroupedSites {
  nGroups: number;
  sites: MineralSite[];
  groups: { [grpKey: string]: { sites: MineralSite[]; label: string } };
  site2groupKey: { [siteId: InternalID]: string };

  constructor(sites: MineralSite[]) {
    this.sites = sites;
    this.groups = {};
    this.site2groupKey = {};
    this.nGroups = 0;

    for (const ms of sites) {
      const key = `${ms.sourceId}--${ms.recordId}`;
      if (this.groups[key] === undefined) {
        this.nGroups += 1;
        this.groups[key] = { sites: [], label: `s${this.nGroups}` };
      }
      this.groups[key].sites.push(ms);
      this.site2groupKey[ms.id] = key;
    }
  }
}

class SelectedSites {
  groups: Set<string>;

  constructor() {
    this.groups = new Set();
  }

  clone(): SelectedSites {
    const ret = new SelectedSites();
    ret.groups = new Set(this.groups);
    return ret;
  }

  has(id: InternalID, siteGroups: GroupedSites): boolean {
    return this.groups.has(siteGroups.site2groupKey[id]);
  }

  add(siteId: InternalID, siteGroups: GroupedSites): SelectedSites {
    const other = this.clone();
    other.groups.add(siteGroups.site2groupKey[siteId]);
    return other;
  }

  delete(siteId: InternalID, siteGroups: GroupedSites): SelectedSites {
    const other = this.clone();
    other.groups.delete(siteGroups.site2groupKey[siteId]);
    return other;
  }
}

export const EditDedupMineralSite = observer(({ dedupSite, commodity, readonly }: EditDedupMineralSiteProps) => {
  const stores = useStores();
  const { mineralSiteStore, userStore, dedupMineralSiteStore, settingStore } = stores;
  const user = userStore.getCurrentUser()!;

  const [editField, setEditField] = useState<EditableField | undefined>(undefined);
  const [selectedRows, setSelectedRows] = useState<SelectedSites>(new SelectedSites());
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<InternalID>>(new Set());

  const [fetchedSites, siteGroups] = useMemo(() => {
    const tmpLst: (MineralSite | null | undefined)[] = dedupSite.sites.map((site) => mineralSiteStore.get(site.id));
    // no idea why typescript compiler incorrectly complains about the incorrect type
    const fetchedSites = tmpLst.filter((site) => site !== undefined) as (MineralSite | null)[];
    const sites = fetchedSites.filter((site) => site !== null) as MineralSite[];

    return [fetchedSites, new GroupedSites(sites)];
  }, [dedupSite.sites, mineralSiteStore.records.size]);
  const isLoading = mineralSiteStore.state.value === "updating" || fetchedSites.length !== dedupSite.sites.length;

  const ungroupTogether = async () => {
    const ungroupPayload = [
      {
        sites: Array.from(selectedRows.groups).flatMap((grpKey) => {
          return siteGroups.groups[grpKey].sites.map((site) => site.id);
        }),
      },
    ];

    const remainGroup = Object.keys(siteGroups.groups)
      .filter((grpKey) => !selectedRows.groups.has(grpKey))
      .flatMap((grpKey) => siteGroups.groups[grpKey].sites.map((site) => site.id));
    if (remainGroup.length > 0) {
      ungroupPayload.push({ sites: remainGroup });
    }

    const newIds = await dedupMineralSiteStore.updateSameAsGroup(ungroupPayload);
    if (commodity && commodity.id) {
      const commodityId = commodity.id;
      await dedupMineralSiteStore.replaceSites([dedupSite.id], newIds, commodityId);
      message.success("Ungrouping was successful!");
    }
  };

  const ungroupSeparately = async () => {
    const ungroupPayload = Array.from(selectedRows.groups).map((grpKey) => {
      return {
        sites: siteGroups.groups[grpKey].sites.map((site) => site.id),
      };
    });

    const remainGroup = Object.keys(siteGroups.groups)
      .filter((grpKey) => !selectedRows.groups.has(grpKey))
      .flatMap((grpKey) => siteGroups.groups[grpKey].sites.map((site) => site.id));
    if (remainGroup.length > 0) {
      ungroupPayload.push({ sites: remainGroup });
    }

    const newIds = await dedupMineralSiteStore.updateSameAsGroup(ungroupPayload);

    if (commodity && commodity.id) {
      const commodityId = commodity.id;
      await dedupMineralSiteStore.replaceSites([dedupSite.id], newIds, commodityId);
      message.success("Ungrouping was successful!");
    }
  };

  // whether to scroll the table horizontally
  const scrollX = settingStore.displayColumns.size > 0;

  // a column header with a pencil that opens the edit modal; in readonly mode it is just the label
  const editableTitle = (label: string, field: EditableField) => {
    if (readonly) {
      return <span>{label}</span>;
    }
    return (
      <Flex justify="space-between">
        <span>{label}</span>
        <EditOutlined className={styles.editButton} onClick={() => setEditField(field)} />
      </Flex>
    );
  };

  const columns: TableColumnsType<any> = useMemo(() => {
    const typeAndRankColumns: TableColumnsType<any> = [];
    const beforeSourceColumns: TableColumnsType<any> = [];

    if (settingStore.displayColumns.has("siteType")) {
      typeAndRankColumns.push({
        title: editableTitle("Type", "siteType"),
        key: "siteType",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.siteType} />;
        },
      });
    }
    if (settingStore.displayColumns.has("siteRank")) {
      typeAndRankColumns.push({
        title: editableTitle("Rank", "siteRank"),
        key: "siteRank",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.siteRank} />;
        },
      });
    }

    if (settingStore.displayColumns.has("mineral_form")) {
      beforeSourceColumns.push({
        title: editableTitle("Mineral Form", "mineralForm"),
        key: "mineralForm",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.mineralForm.join(", ")} />;
        },
      });
    }
    if (settingStore.displayColumns.has("geology_info")) {
      beforeSourceColumns.push({
        title: editableTitle("Alteration", "alteration"),
        key: "alteration",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.alteration} />;
        },
      });

      beforeSourceColumns.push({
        title: editableTitle("Concentration Process", "concentrationProcess"),
        key: "concentration-process",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.concentrationProcess} />;
        },
      });

      beforeSourceColumns.push({
        title: editableTitle("Ore Control", "oreControl"),
        key: "ore-control",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.oreControl} />;
        },
      });

      beforeSourceColumns.push({
        title: editableTitle("Host Rock Unit", "hostRock"),
        key: "host-rock-unit",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.hostRock?.unit} />;
        },
      });

      beforeSourceColumns.push({
        title: editableTitle("Host Rock Type", "hostRock"),
        key: "host-rock-type",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.hostRock?.type} />;
        },
      });

      beforeSourceColumns.push({
        title: "Structure",
        key: "structure",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.structure} />;
        },
      });

      beforeSourceColumns.push({
        title: editableTitle("Associated Rock Unit", "associatedRock"),
        key: "associated-rock-unit",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.associatedRock?.unit} />;
        },
      });

      beforeSourceColumns.push({
        title: editableTitle("Associated Rock Type", "associatedRock"),
        key: "associated-rock-type",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.associatedRock?.type} />;
        },
      });

      beforeSourceColumns.push({
        title: editableTitle("Tectonic", "tectonic"),
        key: "tectonic",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.geologyInfo?.tectonic} />;
        },
      });
    }
    if (settingStore.displayColumns.has("discover_year")) {
      beforeSourceColumns.push({
        title: editableTitle("Discovery Year", "discoveredYear"),
        key: "discoverYear",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.discoveredYear?.toString()} />;
        },
      });
    }

    if (settingStore.displayColumns.has("comment")) {
      beforeSourceColumns.push({
        title: "Comment",
        key: "comment",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.reference.comment} />;
        },
      });
    }

    const defaultColumns: TableColumnsType<any> = [
      {
        title: "",
        key: "select",
        render: (_: any, site: MineralSite) => (
          <Space size="small">
            {!readonly && (
              <Checkbox
                checked={selectedRows.has(site.id, siteGroups)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRows(selectedRows.add(site.id, siteGroups));
                  } else {
                    setSelectedRows(selectedRows.delete(site.id, siteGroups));
                  }
                }}
              />
            )}
            <button
              type="button"
              className={
                "ant-table-row-expand-icon " +
                (expandedRowKeys.has(site.id)
                  ? "ant-table-row-expand-icon-expanded"
                  : "ant-table-row-expand-icon-collapsed")
              }
              style={{ borderRadius: 4, borderColor: "#bbb", opacity: 0.8 }}
              onClick={() => {
                const newExpandedRowKeys = new Set(expandedRowKeys);
                if (newExpandedRowKeys.has(site.id)) {
                  newExpandedRowKeys.delete(site.id);
                } else {
                  newExpandedRowKeys.add(site.id);
                }
                setExpandedRowKeys(newExpandedRowKeys);
              }}
            />
          </Space>
        ),
      },
      {
        title: editableTitle("Name", "name"),
        key: "name",
        render: (_: any, site: MineralSite, index: number) => {
          const createdBy = site.createdBy.split("/").pop()!;
          const fullName = createdBy;
          const username = createdBy;

          const color = getUserColor(username);
          const confidence = dedupSite.sites[index].score;

          return (
            <Flex align="left" vertical={true} gap={4}>
              <Typography.Link href={`/resource/${site.id}`} target="_blank">
                {site.name || "␣"}
              </Typography.Link>
              <Space size={"small"}>
                <Tooltip title={fullName}>
                  <Tag color={color} style={{ margin: 0 }}>
                    {username}
                  </Tag>
                </Tooltip>
                <Tooltip title={`Confidence: ${confidence}`} style={{ textAlign: "center" }}>
                  <Tag>{confidence}</Tag>
                </Tooltip>
              </Space>
            </Flex>
          );
        },
      },
      ...typeAndRankColumns,
      {
        title: editableTitle("Location", "location"),
        key: "location",
        render: (_: any, site: MineralSite) => {
          return (
            <Typography.Text className="font-small" ellipsis={true} style={{ maxWidth: 200 }}>
              {site.locationInfo?.location}
            </Typography.Text>
          );
        },
      },
      {
        title: "CRS",
        key: "crs",
        render: (_: any, site: MineralSite) => {
          return <MayEmptyString value={site.locationInfo?.crs?.observedName} />;
        },
      },
      {
        title: editableTitle("Country", "country"),
        key: "country",
        render: (_: any, site: MineralSite) => {
          return <ListCanEntComponent entities={site.locationInfo?.country || []} store="countryStore" />;
        },
      },
      {
        title: editableTitle("State/Province", "stateOrProvince"),
        key: "state/province",
        render: (_: any, site: MineralSite) => {
          return (
            <ListCanEntComponent entities={site.locationInfo?.stateOrProvince || []} store="stateOrProvinceStore" />
          );
        },
      },
      {
        title: editableTitle("Dep. Type", "depositType"),
        key: "deposit-type",
        render: (_: any, site: MineralSite) => {
          return <CanEntComponent entity={site.depositTypeCandidate[0]} store="depositTypeStore" />;
        },
      },
      {
        title: "Dep. Confidence",
        key: "dep-type-confidence",
        render: (_: any, site: MineralSite) => {
          if (site.depositTypeCandidate.length === 0) {
            return <Empty />;
          }
          return site.depositTypeCandidate[0].confidence.toFixed(4);
        },
      },
      {
        title: editableTitle("Tonnage (Mt)", "mineralInventory"),
        key: "tonnage",
        render: (_: any, site: MineralSite) => {
          return <Tonnage tonnage={site.gradeTonnage[commodity.id]?.totalTonnage} />;
        },
      },
      {
        title: editableTitle("Grade (%)", "mineralInventory"),
        key: "grade",
        render: (_: any, site: MineralSite) => {
          return <Grade grade={site.gradeTonnage[commodity.id]?.totalGrade} />;
        },
      },
      {
        title: "Contained Metal (tonnes)",
        key: "containedMetal",
        render: (_: any, site: MineralSite) => {
          return (
            <ContainedMetal
              tonnage={site.gradeTonnage[commodity.id]?.totalTonnage}
              grade={site.gradeTonnage[commodity.id]?.totalGrade}
            />
          );
        },
      },
      ...beforeSourceColumns,
      {
        title: "Source",
        key: "reference",
        render: (_: any, site: MineralSite) => {
          return (
            <div style={{ maxWidth: 200, display: "inline-block" }}>
              <ReferenceComponent site={site} />
              <Tooltip
                trigger="click"
                title="This key identifies same deposits from the same record of a data source. When select/unselect a deposit, all deposits with the same key will be selected/unselected together."
              >
                <Typography.Text type="secondary" strong={true} className="font-small" style={{ cursor: "pointer" }}>
                  &nbsp;(
                  {siteGroups.groups[siteGroups.site2groupKey[site.id]].label})
                </Typography.Text>
              </Tooltip>
            </div>
          );
        },
      },
    ];

    if (scrollX) {
      defaultColumns[0].fixed = "left";
      defaultColumns[1].fixed = "left";
      defaultColumns[defaultColumns.length - 1].fixed = "right";
    }

    return defaultColumns;
  }, [commodity.id, siteGroups, selectedRows, ungroupTogether, scrollX, readonly]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        mineralSiteStore.fetchByIds(dedupSite.sites.map((site) => site.id));
      } catch (error) {
        console.error("Error in fetchData:", error);
      }
    };

    fetchData();
  }, [dedupSite.sites, mineralSiteStore]);

  const currentSite = siteGroups.sites.find((site) => site.createdBy == user.url);

  let groupBtns = undefined;
  if (!readonly && siteGroups.nGroups > 1 && selectedRows.groups.size > 0) {
    const ungrpSepBtn = (
      <Button key="separately" type="primary" onClick={ungroupSeparately}>
        Ungroup Separately
      </Button>
    );
    const ungrpTogBtn = (
      <Button key="together" type="primary" onClick={ungroupTogether}>
        Ungroup Together
      </Button>
    );
    if (selectedRows.groups.size === 1) {
      groupBtns = [ungrpTogBtn];
    } else if (selectedRows.groups.size === siteGroups.nGroups) {
      groupBtns = [ungrpSepBtn];
    } else {
      groupBtns = [ungrpSepBtn, ungrpTogBtn];
    }
    groupBtns = (
      <Space>
        {groupBtns}
        <Tooltip
          trigger={"click"}
          title="“Ungroup Separately” creates N new groups, each containing one or more selected deposits from the same record of a data source. “Ungroup Together” creates a single new group containing all the selected deposits."
        >
          <InfoCircleOutlined />
        </Tooltip>
      </Space>
    );
  }

  return (
    // -44px for the left & right padding of the main container, -16px for the left & right padding of the expandable row
    <Flex vertical={true} gap="small" style={scrollX ? { width: "calc(100vw - 44px - 44px - 16px - 16px)" } : {}}>
      {groupBtns}
      <Table<MineralSite>
        className={styles.table}
        bordered={true}
        pagination={false}
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={siteGroups.sites}
        loading={isLoading}
        rowClassName={(site) => {
          return site.createdBy.includes(userStore.getCurrentUser()!.url) ? styles.myEditedRow : "";
        }}
        expandable={{
          expandedRowRender: (site) => {
            return (
              <Descriptions
                size={"small"}
                bordered={true}
                items={[
                  {
                    key: "commodity",
                    label: "Commodities",
                    children: <CommodityList site={site} />,
                    span: 3,
                  },
                  {
                    key: "mineral-form",
                    label: "Mineral Forms",
                    children: site.mineralForm.join(", "),
                    span: 3,
                  },
                  {
                    key: "geology-info",
                    label: "Geology Info",
                    span: 3,
                    children:
                      site.geologyInfo === undefined ? undefined : (
                        <Descriptions
                          size={"small"}
                          bordered={true}
                          items={[
                            {
                              key: "alteration",
                              label: "Alteration",
                              children: site.geologyInfo.alteration,
                            },
                            {
                              key: "concentration-process",
                              label: "Concentration Process",
                              children: site.geologyInfo.concentrationProcess,
                            },
                            {
                              key: "ore-control",
                              label: "Ore Control",
                              children: site.geologyInfo.oreControl,
                            },
                            {
                              key: "host-rock-unit",
                              label: "Host Rock Unit",
                              children: site.geologyInfo.hostRock?.unit,
                            },
                            {
                              key: "host-rock-type",
                              label: "Host Rock Type",
                              children: site.geologyInfo.hostRock?.type,
                            },
                            {
                              key: "structure",
                              label: "Structure",
                              children: site.geologyInfo.structure,
                            },
                            {
                              key: "associated-rock-unit",
                              label: "Associated Rock Unit",
                              children: site.geologyInfo.associatedRock?.unit,
                            },
                            {
                              key: "associated-rock-type",
                              label: "Associated Rock Type",
                              children: site.geologyInfo.associatedRock?.type,
                            },
                            {
                              key: "tectonic",
                              label: "Tectonic",
                              children: site.geologyInfo.tectonic,
                            },
                          ]}
                        />
                      ),
                  },
                  {
                    key: "discovered-year",
                    label: "Discovery Year",
                    children: site.discoveredYear,
                    span: 3,
                  },
                  {
                    key: "comment",
                    label: "Comment",
                    children: site.reference.comment,
                    span: 3,
                  },
                ]}
              />
            );
          },
          showExpandColumn: false,
          expandedRowKeys: Array.from(expandedRowKeys),
        }}
        scroll={scrollX ? { x: "max-content" } : undefined}
      />
      {!readonly && (
        <EditSiteField
          key={editField}
          dedupSite={dedupSite}
          sites={siteGroups.sites}
          currentSite={currentSite}
          editField={editField}
          onCancel={() => setEditField(undefined)}
          commodity={commodity}
        />
      )}
    </Flex>
  );
}) as React.FC<EditDedupMineralSiteProps>;
