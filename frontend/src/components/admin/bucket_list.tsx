import { api } from "@/lib/api";
import { Bucket } from "@/lib/types";
import { DeleteOutlined } from "@ant-design/icons";
import { useAntdTable } from "ahooks";
import { Popconfirm } from "antd";
import Table from "antd/es/table/Table";
import { forwardRef, useImperativeHandle } from "react";

export const AdminBuckets = forwardRef((_, ref) => {
  const { tableProps, refresh } = useAntdTable(
    async ({ pageSize, current }) => {
      return await api.bucket.listBuckets({
        page: current,
        page_size: pageSize,
      });
    }
  );

  useImperativeHandle(ref, () => {
    return { refresh };
  });
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
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Bucket) => (
        <Popconfirm
          title="Are you sure?"
          onConfirm={() => api.bucket.delBucket(record.id).then(refresh)}
        >
          <DeleteOutlined style={{ color: "red" }} />
        </Popconfirm>
      ),
    },
  ];

  return <Table columns={columns} {...tableProps} rowKey="id" />;
});
