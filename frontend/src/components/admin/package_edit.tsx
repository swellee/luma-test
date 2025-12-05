import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Package, PackageStatus, Bucket, ObjectInfo } from "@/lib/types";
import { Button, Table, Tag, message, Spin, Card, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAntdTable, useRequest } from "ahooks";
import { LeftOutlined } from "@ant-design/icons";

export default function PackageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const handleBack = () => navigate(-1);
  const {
    data: packageDetail,
    mutate: mutatePackage,
    loading,
  } = useRequest(
    async () => {
      const res = await api.packages.getPackageDetail(parseInt(id!));
      if (res.items.length > 0) {
        setSelectedKeys(res.items);
      }
      return res;
    },
    {
      ready: !!id,
      refreshDeps: [id],
    }
  );

  const { tableProps: imageTableProps } = useAntdTable(
    async ({ current, pageSize }) => {
      const res = await api.bucket.listObjects(
        packageDetail!.bucketId,
        "images",
        current,
        pageSize
      );
      return res;
    },
    {
      ready: !!packageDetail,
      refreshDeps: [packageDetail?.bucketId],
    }
  );

  // 处理全选
  const onSelectChange = (selectedRowKeys: React.Key[]) => {
    setSelectedKeys(selectedRowKeys.map((key) => String(key)));
  };

  // 保存 package
  const handleSave = async () => {
    if (!packageDetail || selectedKeys.length === 0) return;

    try {
      setSaving(true);
      await api.packages.savePackage({
        id: packageDetail.id,
        bucketId: packageDetail.bucketId,
        name: packageDetail.name,
        items: selectedKeys,
      });

      message.success("Package saved successfully");

      // 更新本地数据
    } catch (error) {
      console.error("Failed to save package:", error);
      message.error("Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  // 发布 package
  const handlePublish = async () => {
    if (!packageDetail) return;

    try {
      setPublishing(true);
      await api.packages.publishPackage(packageDetail.id);

      message.success("Package published successfully");

      // 更新本地状态
      mutatePackage({
        ...packageDetail,
        status: PackageStatus.PUBLISHED,
      });

      // 刷新页面
      navigate(0);
    } catch (error) {
      console.error("Failed to publish package:", error);
      message.error("Failed to publish package");
    } finally {
      setPublishing(false);
    }
  };

  // 表格列定义
  const columns: ColumnsType<ObjectInfo> = [
    {
      title: "File Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>{record.key}</div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type) => (
        <Tag color={type === "image" ? "blue" : "purple"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (size) => (size ? `${(size / 1024).toFixed(2)} KB` : "-"),
    },
    {
      title: "Last Modified",
      dataIndex: "lastModified",
      key: "lastModified",
      width: 150,
      render: (date) => (date ? date.toLocaleDateString() : "-"),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const isPublished = packageDetail?.status === PackageStatus.PUBLISHED;
  const canSave = selectedKeys.length > 0 && !isPublished;

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title="Package Details"
        style={{ marginBottom: "24px" }}
        extra={
          <Button icon={<LeftOutlined />} onClick={handleBack}>
            Back
          </Button>
        }
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{packageDetail?.name}</h2>
            <div style={{ marginTop: "8px" }}>
              <Tag color={isPublished ? "green" : "orange"}>
                Status: {packageDetail?.status}
              </Tag>
              <span style={{ marginLeft: "16px" }}>
                Bucket: {`ID: ${packageDetail?.bucketId}`}
              </span>
              <span style={{ marginLeft: "16px" }}>
                Selected Items: {selectedKeys.length}
              </span>
            </div>
          </div>
          <Space>
            <Button
              type="primary"
              onClick={handleSave}
              disabled={!canSave}
              loading={saving}
            >
              Save Package
            </Button>
            <Button
              type="default"
              onClick={handlePublish}
              disabled={isPublished || selectedKeys.length === 0}
              loading={publishing}
            >
              {isPublished ? "Published" : "Publish Package"}
            </Button>
          </Space>
        </div>
      </Card>

      <Card title="Bucket Files (Images and Videos)">
        <div style={{ marginBottom: "16px" }}>
          <div>Total files: {imageTableProps.dataSource.length}</div>
          <div>Selected files: {selectedKeys.length}</div>
        </div>

        <Table
          columns={columns}
          {...imageTableProps}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: onSelectChange,
          }}
          scroll={{ y: 400 }}
        />
      </Card>
    </div>
  );
}
