import { api } from "@/lib/api";
import { useAntdTable } from "ahooks";
import Table from "antd/es/table/Table";

export default function AdminBuckets() {
  const { tableProps, refresh } = useAntdTable(
    async ({ pageSize, current }) => {
      return await api.bucket.listBuckets({
        page: current,
        page_size: pageSize,
      });
    }
  );

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Bucket Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Region",
      dataIndex: "region",
      key: "region",
    },
  ];

  return <Table columns={columns} {...tableProps} rowKey="id"/>;
}
