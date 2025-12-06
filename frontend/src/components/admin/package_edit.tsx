import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { PackageStatus, ObjectInfo, BucketObjectListRes } from "@/lib/types";
import {
  Button,
  Tag,
  message,
  Spin,
  Card,
  Space,
  Tree,
  Empty,
  List,
  Checkbox,
  Divider,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import VirtualList from "rc-virtual-list";

import { useRequest } from "ahooks";
import { CheckOutlined, LeftOutlined } from "@ant-design/icons";
import { DirectoryNode } from "@/lib/api/bucket";

const CONTAINER_HEIGHT = 400;
const PAGE_SIZE = 20;

export default function PackageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [curDir, setCurDir] = useState<DirectoryNode>();
  const selectedKeys = useRef<Set<string>>(new Set());
  const [continuationToken, setContinuationToken] = useState<
    string | undefined
  >(undefined);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [objects, setObjects] = useState<ObjectInfo[]>([]);
  const [loadingObjects, setLoadingObjects] = useState<boolean>(false);

  const handleBack = () => navigate(-1);
  const {
    data: packageDetail,
    mutate: mutatePackage,
    loading,
  } = useRequest(
    async () => {
      const res = await api.packages.getPackageDetail(parseInt(id!));
      if (res.items.length > 0) {
        selectedKeys.current = new Set(res.items);
      }
      return res;
    },
    {
      ready: !!id,
      refreshDeps: [id],
    }
  );

  const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
    setCurDir(info.node);
  };

  const { data: bucketInfo } = useRequest(
    async () => {
      const bucket = await api.bucket.getBucket(packageDetail?.bucketId!);
      const bucketFolders = await api.bucket.listDirectoryTree(bucket);
      if (packageDetail?.items?.length) {
        const bucketFolderKey =
          packageDetail!.items[0].substring(
            0,
            packageDetail.items[0].lastIndexOf("/")
          ) + "/";
        const bucketFolder = bucketFolders
          .flat(10)
          .find((item) => item.key === bucketFolderKey);
        if (bucketFolder) {
          setCurDir(bucketFolder);
        }
      }

      return {
        bucket,
        folders: bucketFolders,
      };
    },
    {
      ready: !!packageDetail?.bucketId,
      refreshDeps: [packageDetail?.bucketId],
    }
  );

  // 加载当前目录的文件
  useEffect(() => {
    if (curDir?.isLeaf) {
      setContinuationToken(undefined);
      loadObjects(false);
    }
  }, [curDir]);

  // 加载对象列表 - 修复分页问题
  const loadObjects = async (append = true) => {
    if (!bucketInfo?.bucket) return;
    if (!curDir?.isLeaf) return;

    try {
      setLoadingObjects(true);

      // 对于 S3 分页，我们需要处理 ContinuationToken
      // 但为了简化，我们每次重新请求第一页，忽略 ContinuationToken
      // 这样分页控件就能正常工作
      const res: BucketObjectListRes = await api.bucket.listObjects(
        bucketInfo.bucket,
        curDir.key,
        PAGE_SIZE,
        continuationToken // 使用 ContinuationToken
      );

      setObjects(append ? objects.concat(res.list) : res.list ?? []);
      setHasMore(res.hasMore);
      // 不再存储 ContinuationToken，因为每次分页都重新从第一页开始
      setContinuationToken(res.nextContinuationToken);
      append && message.success(`${res.list.length} more items loaded!`);
    } catch (error) {
      console.error("Error loading objects:", error);
      message.error("加载文件列表失败");
    } finally {
      setLoadingObjects(false);
    }
  };

  const onScroll = (e: React.UIEvent<HTMLElement, UIEvent>) => {
    if (
      Math.abs(
        e.currentTarget.scrollHeight -
          e.currentTarget.scrollTop -
          CONTAINER_HEIGHT
      ) <= 1
    ) {
      loadObjects();
    }
  };

  // 处理全选
  const handleSelect = (key: string, selected: boolean) => {
    if (selected) {
      selectedKeys.current.add(key);
      console.log('add key', key)
    } else {
      console.log('delete key', key)
      selectedKeys.current.delete(key);
    }
  };

  // 保存 package
  const handleSave = async () => {
    if (!packageDetail || selectedKeys.current.size === 0) return;

    try {
      setSaving(true);
      await api.packages.savePackage({
        id: packageDetail.id,
        bucketId: packageDetail.bucketId,
        name: packageDetail.name,
        items: Array.from(selectedKeys.current),
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
        <Tag
          color={
            type === "image" ? "blue" : type === "video" ? "purple" : "default"
          }
        >
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (size) => {
        if (!size) return "-";
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
      },
    },
    {
      title: "Last Modified",
      dataIndex: "last_modified",
      key: "last_modified",
      width: 150,
      render: (date) => (date ? new Date(date).toLocaleDateString() : "-"),
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
  const canSave = selectedKeys.current.size > 0 && !isPublished;

  return (
    <div className="p-6">
      <Card
        title={
          <h2 className="text-green-600 text-2xl!">{packageDetail?.name}</h2>
        }
        className="p-6"
        extra={
          <Button icon={<LeftOutlined />} onClick={handleBack}>
            Back
          </Button>
        }
      >
        <div className="flex gap-2 space-between items-center">
          <div style={{ marginTop: "8px" }}>
            <Tag color={isPublished ? "green" : "orange"}>
              {packageDetail?.status}
            </Tag>
            <span style={{ marginLeft: "16px" }}>
              Bucket ID: {packageDetail?.bucketId}
            </span>
            <span style={{ marginLeft: "16px" }}>
              Items Count: {selectedKeys.current.size}
            </span>
          </div>
          <Button
            type="primary"
            className="ml-auto"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
          >
            Save Package
          </Button>
          <Button
            type="default"
            onClick={handlePublish}
            disabled={isPublished || selectedKeys.current.size === 0}
            loading={publishing}
          >
            {isPublished ? "Published" : "Publish Package"}
          </Button>
        </div>
      </Card>
      <br />
      <Card className="my-6">
        <div className="p-6 flex gap-6 ">
          {/* 目录树 */}
          <div className="flex-1 border-r border-gray-600">
            <div className="rounded-2xl p-2 bg-gray-800/20">
              Bucket folders:
            </div>
            {bucketInfo?.folders?.length ? (
              <Tree
                treeData={bucketInfo?.folders || []}
                defaultExpandAll
                showIcon
                multiple={false}
                onSelect={handleTreeSelect}
                selectedKeys={curDir?.key ? [curDir.key] : []}
              />
            ) : (
              <div className="flex items-center justify-center">
                <Spin spinning size="large" />
              </div>
            )}
          </div>

          {/* 文件列表 */}
          <div className="flex-3">
            <div className="flex gap-6 items-center rounded-2xl p-2 bg-gray-800/20">
              <div>
                Current directory:{" "}
                <div className="text-sm text-center">{curDir?.key || "/"}</div>
              </div>
              <div>
                Listed files:{" "}
                <div className="text-sm text-center">{objects.length}</div>
              </div>
              <div>
                Selected files:{" "}
                <div className="text-sm text-center">
                  {selectedKeys.current.size}
                </div>
              </div>
              <Button icon={<CheckOutlined />}>check all</Button>
            </div>

            <List loading={loadingObjects} className="container-bg">
              <VirtualList
                data={objects}
                height={CONTAINER_HEIGHT}
                itemHeight={32}
                itemKey="key"
                onScroll={onScroll}
              >
                {(item: ObjectInfo) => (
                  <List.Item key={item.key}>
                    <Checkbox
                      checked={selectedKeys.current.has(item.key)}
                      onChange={(e) => handleSelect(item.key, e.target.checked)}
                    />
                    <span>{item.name}</span>
                    <span>{item.type}</span>
                    <span>{item.size}</span>
                    <span>{item.last_modified}</span>
                  </List.Item>
                )}
              </VirtualList>
            </List>
          </div>
        </div>
      </Card>
    </div>
  );
}
