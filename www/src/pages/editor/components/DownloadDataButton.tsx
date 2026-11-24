import { DownloadOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import axios from "axios";
import { SERVER } from "env";
import { useState } from "react";
import { Commodity } from "models";
import { splitCsvRecords } from "models/dedupMineralSite";
import { InternalID } from "models/typing";
import { observer } from "mobx-react-lite";

interface DownloadButtonProp {
  commodity?: Commodity;
  // the sites shown in the table; only these rows are saved
  visibleSiteIds: InternalID[];
}

const getFilename = (contentDisposition: string | undefined, commodity: Commodity) => {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/);
  if (match) {
    return match[1];
  }
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${commodity.name.toLowerCase()}_${date}.csv`;
};

const saveFile = (content: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const DownloadButton: React.FC<DownloadButtonProp> = observer(({ commodity, visibleSiteIds }) => {
  const [loading, setLoading] = useState(false);

  // The server CSV can only be filtered by one value per filter, so we download the commodity's CSV
  // and keep the rows of the sites shown in the table. Rows are kept unchanged, in the server's order.
  const handleDownload = async () => {
    if (commodity === undefined) return;

    setLoading(true);
    try {
      const resp = await axios.get(`${SERVER}/api/v1/dedup-mineral-sites`, {
        params: { format: "csv", commodity: commodity.id },
        responseType: "text",
      });

      const visibleIds = new Set(visibleSiteIds);
      const [header, ...records] = splitCsvRecords(resp.data);
      // the first column is the site URI, which never contains a comma or a quote
      const rows = records.filter((record) => {
        const uri = record.substring(0, record.indexOf(","));
        return visibleIds.has(uri.substring(uri.lastIndexOf("/") + 1));
      });

      saveFile([header, ...rows].join("\n") + "\n", getFilename(resp.headers["content-disposition"], commodity));
    } catch (error) {
      message.error("Failed to download the data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="primary" icon={<DownloadOutlined />} loading={loading} disabled={commodity === undefined} onClick={() => handleDownload()}>
      Download
    </Button>
  );
});
