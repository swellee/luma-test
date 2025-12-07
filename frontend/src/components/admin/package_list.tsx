import { api } from "@/lib/api";
import { Package, PackageStatus, PackageItem } from "@/lib/types";
import { MoreOutlined } from "@ant-design/icons";
import { useAntdTable } from "ahooks";
import { Dropdown, Table, Tag, Button } from "antd";
import { forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router";

export const AdminPackageList = forwardRef((_, ref) => {
  const navigate = useNavigate();
  const { tableProps: userTableProps, refresh: refreshUserTable } =
    useAntdTable(async ({ pageSize, current }) => {
      return api.packages.getPackageList(current, pageSize);
    });

  useImperativeHandle(ref, () => {
    return { refresh: refreshUserTable };
  });

  const handleEdit = (id: number) => {
    navigate(`/dashboard/packages/edit/${id}`);
  };

  const handlePublish = async (id: number) => {
    try {
      await api.packages.publishPackage(id);
      refreshUserTable();
    } catch (error) {
      console.error("Failed to publish package:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.packages.deletePackage(id);
      refreshUserTable();
    } catch (error) {
      console.error("Failed to delete package:", error);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Name",
      key: "name",
      dataIndex: "name",
      render: (text: string, record: PackageItem) => (
        <Button
          type="link"
          onClick={() => handleEdit(record.id)}
          style={{ padding: 0, height: "auto" }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "Bucket Id",
      dataIndex: "bucketId",
      key: "bucketId",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: PackageStatus) => (
        <Tag color={status === PackageStatus.PUBLISHED ? "green" : "orange"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (item: PackageItem) => (
        <Dropdown
          menu={{
            items:
              item.status === PackageStatus.PUBLISHED
                ? []
                : [
                    {
                      key: "edit",
                      label: "Edit",
                      onClick: () => handleEdit(item.id),
                    },
                    {
                      key: "publish",
                      label: "Publish",
                      onClick: () => handlePublish(item.id),
                    },
                    {
                      key: "delete",
                      label: "Delete",
                      onClick: () => handleDelete(item.id),
                    },
                  ],
          }}
          trigger={["click"]}
        >
          <MoreOutlined />
        </Dropdown>
      ),
    },
  ];

  return <Table columns={columns} {...userTableProps} rowKey="id" />;
});
