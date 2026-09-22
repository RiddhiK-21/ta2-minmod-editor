import { Button, Flex } from "antd";
import { observer } from "mobx-react-lite";
import { SearchBar, useSearchArgs } from "./components/SearchBar";
import { DedupMineralSiteTable } from "./components/DedupMineralSiteTable";
import { useRef } from "react";
import { routes } from "routes";
import { NewMineralSiteModal, NewMineralSiteFormRef } from "./subpages/NewMineralSiteModal";

export const EditorPage = observer(() => {
  const [searchArgs, normSearchArgs, setSearchArgs] = useSearchArgs(routes.editor);
  const newMineralSiteFormRef = useRef<NewMineralSiteFormRef>(null);
  const handleOpenNewMineralSiteForm = () => {
    if (newMineralSiteFormRef.current != null || newMineralSiteFormRef.current != undefined) {
      newMineralSiteFormRef.current.open();
    }
  };

  return (
    <Flex vertical={true} gap="small">
      <SearchBar searchArgs={searchArgs} setSearchArgs={setSearchArgs} onOpenNewMineralSiteForm={handleOpenNewMineralSiteForm} normSearchArgs={normSearchArgs} />
      <DedupMineralSiteTable commodity={normSearchArgs.commodity} depositType={normSearchArgs.depositType} country={normSearchArgs.country} stateOrProvince={normSearchArgs.stateOrProvince} />
      <NewMineralSiteModal ref={newMineralSiteFormRef} commodity={normSearchArgs.commodity} />
    </Flex>
  );
});
