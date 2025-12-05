import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Package, PackageStatus, Bucket, ObjectInfo } from "@/lib/types";
import { Button, Table, Tag, message, Spin, Card, Space, Checkbox } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import type { ColumnsType } from "antd/es/table";

interface FileItem {
  key: string;
  name: string;
  type: 'image' | 'video' | 'other';
  size?: number;
  lastModified?: Date;
}

export default function PackageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [packageData, setPackageData] = useState<Package | null>(null);
  const [bucketData, setBucketData] = useState<Bucket | null>(null);
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 获取 package 详情
  useEffect(() => {
    if (!id) return;

    const fetchPackageDetail = async () => {
      try {
        setLoading(true);
        const response = await api.packages.getPackageDetail(parseInt(id));
        setPackageData(response);
        
        // 设置已选中的 items
        if (response.items) {
          setSelectedKeys(response.items);
        }
        
        // 获取 bucket 信息
        if (response.bucketId) {
          const bucketResponse = await api.bucket.getBucket(response.bucketId);
          setBucketData(bucketResponse);
          
          // 获取 bucket 中的文件列表
          await fetchBucketFiles(response.bucketId, bucketResponse.name);
        }
      } catch (error) {
        console.error("Failed to fetch package detail:", error);
        message.error("Failed to load package details");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageDetail();
  }, [id, navigate]);

  // 获取 bucket 中的文件列表
  const fetchBucketFiles = async (bucketId: number, bucketName: string) => {
    try {
      const objects = await api.bucket.listObjects(bucketId);
      
      // 转换为 FileItem 格式（后端已经筛选了图片和视频）
      const filteredFiles: FileItem[] = objects.map((obj: ObjectInfo) => {
        const extension = obj.key.split('.').pop()?.toLowerCase() || '';
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension);
        
        return {
          key: obj.key,
          name: obj.name,
          type: isImage ? 'image' as const : 'video' as const,
          size: obj.size,
          lastModified: obj.last_modified ? new Date(obj.last_modified) : undefined,
        };
      });
      
      setFileList(filteredFiles);
    } catch (error) {
      console.error("Failed to fetch bucket files:", error);
      message.error("Failed to load bucket files");
    }
  };

  // 处理复选框选择
  const handleCheckboxChange = (e: CheckboxChangeEvent, fileKey: string) => {
    if (e.target.checked) {
      setSelectedKeys([...selectedKeys, fileKey]);
    } else {
      setSelectedKeys(selectedKeys.filter(key => key !== fileKey));
    }
  };

  // 处理全选
  const handleSelectAll = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      setSelectedKeys(fileList.map(file => file.key));
    } else {
      setSelectedKeys([]);
    }
  };

  // 保存 package
  const handleSave = async () => {
    if (!packageData || selectedKeys.length === 0) return;

    try {
      setSaving(true);
      await api.packages.savePackage({
        id: packageData.id,
        bucketId: packageData.bucketId,
        name: packageData.name,
        items: selectedKeys,
      });
      
      message.success("Package saved successfully");
      
      // 更新本地数据
      setPackageData({
        ...packageData,
        items: selectedKeys,
      });
    } catch (error) {
      console.error("Failed to save package:", error);
      message.error("Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  // 发布 package
  const handlePublish = async () => {
    if (!packageData) return;

    try {
      setPublishing(true);
      await api.packages.publishPackage(packageData.id);
      
      message.success("Package published successfully");
      
      // 更新本地状态
      setPackageData({
        ...packageData,
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
  const columns: ColumnsType<FileItem> = [
    {
      title: (
        <Checkbox
          onChange={handleSelectAll}
          checked={selectedKeys.length === fileList.length && fileList.length > 0}
          indeterminate={selectedKeys.length > 0 && selectedKeys.length < fileList.length}
        />
      ),
      key: 'selection',
      width: 60,
      render: (_, record) => (
        <Checkbox
          checked={selectedKeys.includes(record.key)}
          onChange={(e) => handleCheckboxChange(e, record.key)}
        />
      ),
    },
    {
      title: 'File Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.key}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'image' ? 'blue' : 'purple'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size) => size ? `${(size / 1024).toFixed(2)} KB` : '-',
    },
    {
      title: 'Last Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
      width: 150,
      render: (date) => date ? date.toLocaleDateString() : '-',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!packageData) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Package not found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const isPublished = packageData.status === PackageStatus.PUBLISHED;
  const canSave = selectedKeys.length > 0 && !isPublished;

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Package Details" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>{packageData.name}</h2>
            <div style={{ marginTop: '8px' }}>
              <Tag color={isPublished ? 'green' : 'orange'}>
                Status: {packageData.status}
              </Tag>
              <span style={{ marginLeft: '16px' }}>
                Bucket: {bucketData?.name || `ID: ${packageData.bucketId}`}
              </span>
              <span style={{ marginLeft: '16px' }}>
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
              {isPublished ? 'Published' : 'Publish Package'}
            </Button>
          </Space>
        </div>
      </Card>

      <Card title="Bucket Files (Images and Videos)">
        <div style={{ marginBottom: '16px' }}>
          <div>Total files: {fileList.length}</div>
          <div>Selected files: {selectedKeys.length}</div>
        </div>
        
        <Table
          columns={columns}
          dataSource={fileList}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          scroll={{ y: 400 }}
        />
      </Card>
    </div>
  );
}
