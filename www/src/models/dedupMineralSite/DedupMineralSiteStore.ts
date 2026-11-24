import { RStore, FetchResponse, FetchResult, SingleKeyIndex } from "gena-app";
import { SERVER } from "env";
import { Commodity } from "../commodity";
import { DedupMineralSite, DedupMineralSiteDepositType, DedupMineralSiteLocation, DedupMineralSiteOriginalSite } from "./DedupMineralSite";
import axios from "axios";
import { action, makeObservable, observable, runInAction } from "mobx";
import { NamespaceManager } from "../Namespace";
import { GradeTonnage } from "../mineralSite";
import { InternalID } from "../typing";
import { GeologyInfo } from "models/mineralSite/GeologyInfo";

// the server is only asked for a commodity's sites; the other filters are applied in the browser (see SiteFilter)
interface SearchCondition {
  commodity: InternalID;
}

class CacheSearchResult {
  condition: SearchCondition;
  results: FetchResult<InternalID>;

  public constructor({ condition, results }: { condition: SearchCondition; results: FetchResult<InternalID> }) {
    this.condition = condition;
    this.results = results;

    makeObservable(this, {
      condition: observable,
      results: observable,
      replaceSites: action,
      insertSites: action,
    });
  }

  public static getCondition(commodity: Commodity): SearchCondition {
    return {
      commodity: commodity.id,
    };
  }

  public matchCondition(condition: SearchCondition): boolean {
    return this.condition.commodity === condition.commodity;
  }

  public replaceSites(prevIds: Set<InternalID>, newIds: InternalID[]): number {
    const newRecords = [];
    let firstMatch = -1;
    for (const [i, record] of this.results.records.entries()) {
      if (prevIds.has(record)) {
        if (firstMatch >= 0) {
          continue;
        }
        firstMatch = i;
        newRecords.push(...newIds);
      } else {
        newRecords.push(record);
      }
    }

    if (firstMatch >= 0) {
      this.results.records = newRecords;
      this.results.total += newIds.length - prevIds.size;
    }

    return firstMatch;
  }

  public insertSites(newIds: InternalID[], insertAt: number): void {
    this.results.records.splice(insertAt, 0, ...newIds);
    this.results.total += newIds.length;
  }
}

export class DedupMineralSiteStore extends RStore<string, DedupMineralSite> {
  static MAX_CACHE_SEARCH_RESULTS = 10;

  ns: NamespaceManager;
  searchResults: CacheSearchResult[] = [];

  constructor(ns: NamespaceManager) {
    super(`${SERVER}/api/v1/dedup-mineral-sites`, undefined, false);
    this.ns = ns;

    makeObservable(this, {
      searchResults: observable,
      searchAndCache: action,
      forceFetchByURI: action,
      deleteByIds: action,
      replaceSites: action,
      updateSameAsGroup: action,
    });
  }

  /**
   * (private function) Delete dedup mineral sites by their Ids
   * @param ids
   */
  deleteByIds(ids: InternalID[]): void {
    this.state.value = "updating";
    for (const id of ids) {
      const record = this.records.get(id);
      if (record !== undefined && record !== null) {
        this.deindex(record);
        this.records.delete(id);
      }
    }
    this.state.value = "updated";
  }

  /**
   * Replace given dedup sites with new sites -- update the search results with it.
   *
   * @param prevIds previous sites to delete
   * @param newIds new sites to add
   */
  async replaceSites(prevIds: InternalID[], newIds: InternalID[], commodity: Object): Promise<void> {
    // first, fetch the new sites data -- this will override the old one as we choose force.
    const newDedupSites = await this.fetchByIds(newIds, true, { commodity });

    // run in action as it is after async.
    runInAction(() => {
      // only delete sites that are not in newIds
      const deleteIds = prevIds.filter((id) => !newDedupSites.hasOwnProperty(id));
      this.deleteByIds(deleteIds);

      // then we update the search results
      const setPrevIds = new Set(prevIds);
      const newDedupSiteIds = Array.from(Object.keys(newDedupSites));
      for (const results of this.searchResults) {
        results.replaceSites(setPrevIds, newDedupSiteIds);
      }
    });
  }

  async forceFetchByURI(uri: string, commodity: string): Promise<DedupMineralSite | undefined> {
    const id = DedupMineralSite.getId(uri);
    try {
      this.state.value = "updating";

      let resp = await axios.get(`${this.remoteURL}/${id}`, {
        params: { commodity },
      });

      return runInAction(() => {
        let record = this.deserialize(resp.data);
        this.records.set(record.id, record);
        this.index(record);
        this.state.value = "updated";

        return this.records.get(record.id)!;
      });
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // entity does not exist
        runInAction(() => {
          this.records.set(id, null);
          this.state.value = "updated";
        });
        return undefined;
      }

      runInAction(() => {
        this.state.value = "error";
      });
      throw error;
    }
  }

  async searchAndCache(commodity: Commodity) {
    const conditions = CacheSearchResult.getCondition(commodity);

    // skip if we already have the results in cache
    if (this.searchResults.some((result) => result.matchCondition(conditions))) {
      return;
    }

    const results = await this.fetch({
      conditions,
    });

    runInAction(() => {
      this.searchResults.push(
        new CacheSearchResult({
          condition: conditions,
          results: {
            records: results.records.map((record) => record.id),
            total: results.total,
          },
        })
      );

      if (this.searchResults.length > DedupMineralSiteStore.MAX_CACHE_SEARCH_RESULTS) {
        this.searchResults.shift();
      }
    });
  }

  /**
   * Get search results from cache. Return empty if not found
   *
   * @param commodity
   */
  public getCacheSearchResult(commodity: Commodity): FetchResult<DedupMineralSite> {
    const conditions = CacheSearchResult.getCondition(commodity);

    for (const result of this.searchResults) {
      if (result.matchCondition(conditions)) {
        return {
          records: result.results.records.map((id) => this.records.get(id)!),
          total: result.results.total,
        };
      }
    }

    return { records: [], total: 0 };
  }

  public deserialize(record: any): DedupMineralSite {
    const MR = this.ns.MR;
    const MD = this.ns.MD;

    return new DedupMineralSite({
      id: record.id,
      uri: MD.getURI(record.id),
      name: record.name,
      type: record.type,
      rank: record.rank,
      sites: record.sites.map(
        (site: any) =>
          new DedupMineralSiteOriginalSite({
            id: site.id,
            score: site.score,
          })
      ),
      depositTypes: record.deposit_types.map(
        (depositType: any) =>
          new DedupMineralSiteDepositType({
            uri: MR.getURI(depositType.id),
            source: depositType.source,
            confidence: depositType.confidence,
          })
      ),
      location:
        record.location !== undefined
          ? new DedupMineralSiteLocation({
            lat: record.location.lat,
            lon: record.location.lon,
            country: (record.location.country || []).map((country: string) => MR.getURI(country)),
            stateOrProvince: (record.location.state_or_province || []).map((sop: string) => MR.getURI(sop)),
          })
          : undefined,
      gradeTonnage: GradeTonnage.deserialize(record.grade_tonnage[0]),
      mineralForm: record.mineral_form,
      geologyInfo: record.geology_info !== undefined ? GeologyInfo.deserialize(record.geology_info) : undefined,
      discoveredYear: record.discovered_year,
      modifiedAt: record.modified_at,
      trace: record.trace || {},
    });
  }

  async updateSameAsGroup(groups: { sites: InternalID[] }[]): Promise<InternalID[]> {
    this.state.value = "updating";
    const resp = await axios.post("/api/v1/same-as", groups);
    runInAction(() => {
      this.state.value = "updated";
    });
    return resp.data.map((dedupSite: any) => dedupSite.id);
  }

  protected normRemoteSuccessfulResponse(resp: any): FetchResponse {
    return { items: Array.isArray(resp.data) ? resp.data : Object.values(resp.data), total: resp.data.length };
  }

  /**
   * Remove a record (by id) from your indexes
   */
  protected deindex(record: DedupMineralSite): void {
    for (const index of this.indices) {
      index.remove(record);
    }
  }
}
