import { Flex } from "antd";
import { observer } from "mobx-react-lite";
import { useStores } from "models";
import { getSiteFilter, SearchBar, useSearchArgs } from "./components/SearchBar";
import { DedupMineralSiteTable } from "./components/DedupMineralSiteTable";
import { useMemo, useRef, useState } from "react";
import { InternalID } from "models/typing";
import { NewMineralSiteModal, NewMineralSiteFormRef } from "./subpages/NewMineralSiteModal";

export const EditorPage = observer(() => {
  const { userStore } = useStores();
  const [searchArgs, normSearchArgs, setSearchArgs] = useSearchArgs();
  const newMineralSiteFormRef = useRef<NewMineralSiteFormRef>(null);
  const siteFilter = useMemo(() => getSiteFilter(normSearchArgs), [normSearchArgs]);
  // the sites shown in the table, reported by the table so the Download button saves the same rows
  const [visibleSiteIds, setVisibleSiteIds] = useState<InternalID[]>([]);

  // the page is public: anyone can browse it read-only, and logging in unlocks editing
  const readonly = userStore.getCurrentUser() === undefined;

  const handleOpenNewMineralSiteForm = () => {
    if (newMineralSiteFormRef.current != null || newMineralSiteFormRef.current != undefined) {
      newMineralSiteFormRef.current.open();
    }
  };

  return (
    <Flex vertical={true} gap="small">
      <SearchBar
        readonly={readonly}
        searchArgs={searchArgs}
        setSearchArgs={setSearchArgs}
        onOpenNewMineralSiteForm={handleOpenNewMineralSiteForm}
        normSearchArgs={normSearchArgs}
        visibleSiteIds={visibleSiteIds}
      />
      <DedupMineralSiteTable
        readonly={readonly}
        commodity={normSearchArgs.commodity}
        filter={siteFilter}
        onVisibleSitesChange={setVisibleSiteIds}
      />
      {!readonly && <NewMineralSiteModal ref={newMineralSiteFormRef} commodity={normSearchArgs.commodity} />}
    </Flex>
  );
});
