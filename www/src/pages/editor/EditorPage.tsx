import { Flex } from "antd";
import { observer } from "mobx-react-lite";
import { useStores } from "models";
import { SearchBar, useSearchArgs } from "./components/SearchBar";
import { DedupMineralSiteTable } from "./components/DedupMineralSiteTable";
import { useRef } from "react";
import { routes } from "routes";
import { NewMineralSiteModal, NewMineralSiteFormRef } from "./subpages/NewMineralSiteModal";

export const EditorPage = observer(() => {
  const { userStore } = useStores();
  const [searchArgs, normSearchArgs, setSearchArgs] = useSearchArgs(routes.editor);
  const newMineralSiteFormRef = useRef<NewMineralSiteFormRef>(null);

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
      />
      <DedupMineralSiteTable
        readonly={readonly}
        commodity={normSearchArgs.commodity}
        depositType={normSearchArgs.depositType}
        country={normSearchArgs.country}
        stateOrProvince={normSearchArgs.stateOrProvince}
      />
      {!readonly && <NewMineralSiteModal ref={newMineralSiteFormRef} commodity={normSearchArgs.commodity} />}
    </Flex>
  );
});
