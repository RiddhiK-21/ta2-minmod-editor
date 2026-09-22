import { Flex } from "antd";
import { observer } from "mobx-react-lite";
import { routes } from "routes";
import { SearchBar, useSearchArgs } from "../editor/components/SearchBar";
import { DedupMineralSiteTable } from "../editor/components/DedupMineralSiteTable";

/**
 * View-only version of the EditorPage: same data and same login, but every control that
 * creates or modifies a mineral site is suppressed via the `readonly` flag.
 */
export const ViewerPage = observer(() => {
  const [searchArgs, normSearchArgs, setSearchArgs] = useSearchArgs(routes.viewer);

  return (
    <Flex vertical={true} gap="small">
      <SearchBar readonly={true} searchArgs={searchArgs} setSearchArgs={setSearchArgs} normSearchArgs={normSearchArgs} />
      <DedupMineralSiteTable
        readonly={true}
        commodity={normSearchArgs.commodity}
        depositType={normSearchArgs.depositType}
        country={normSearchArgs.country}
        stateOrProvince={normSearchArgs.stateOrProvince}
      />
    </Flex>
  );
});
