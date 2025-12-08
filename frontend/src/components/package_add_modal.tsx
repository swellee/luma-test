import { api } from "@/lib/api";
import { useRequest } from "ahooks";
import { Button, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";

export function usePackageAddModal(showAddBucket: () => Promise<void>) {
  const [visible, setVisible] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<() => void>();
  const [rejectPromise, setRejectPromise] = useState<() => void>();
  const open = () => {
    setVisible(true);
    return new Promise((resolve, reject) => {
      setResolvePromise(() => resolve);
      setRejectPromise(() => reject);
    });
  };

  const close = () => {
    setVisible(false);
    if (resolvePromise) {
      setResolvePromise(undefined);
    }
  };

  return {
    visible,
    open,
    close,
    showAddBucket,
    onResolve: resolvePromise,
    onReject: rejectPromise,
  };
}

export function PackageAddModal({
  visible,
  close,
  showAddBucket,
  onResolve,
  onReject,
}: {
  visible: boolean;
  close: () => void;
  showAddBucket: () => Promise<void>;
  onResolve?: () => void;
  onReject?: () => void;
}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const {
    data: bucketOpts,
    loading: bucketLoading,
    refresh: refreshBucket,
  } = useRequest(
    async () => {
      const res = await api.bucket.listBuckets({ page: 1, page_size: 100 });
      return res.list?.map((item) => ({
        label: item.name,
        value: item.id,
      }));
    },
    { refreshDeps: [visible] }
  );
  const { runAsync, loading } = useRequest(
    async (values: any) => {
      const { name, bucketId } = values;
      const res = await api.packages.savePackage({ name, bucketId, items: [] });
      if (res?.id) {
        navigate(res.id);
        onResolve?.();
      } else {
        onReject?.();
      }
      // @ts-ignore
      form.resetFields();
      close();
    },
    { manual: true }
  );

  const showBucket = () => {
    showAddBucket().then(refreshBucket);
  };
  return (
    <Modal
      title="Add Package"
      open={visible}
      centered
      okText="Add"
      onOk={form.submit}
      onCancel={close}
      loading={loading}
    >
      <Form form={form} layout="vertical" onFinish={runAsync}>
        <Form.Item label="Name" name="name">
          <Input />
        </Form.Item>
        <Form.Item label="Bucket" name="bucketId">
          <Select loading={bucketLoading} options={bucketOpts} />
        </Form.Item>
        <div className="flex gap-4 items-center mt-2">
          <span className="text-gray-500">Need new bucket?</span>{" "}
          <Button type="text" onClick={showBucket}>
            add bucket
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
