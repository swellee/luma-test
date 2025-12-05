import { api } from "@/lib/api";
import { useRequest } from "ahooks";
import { Form, Input, Modal } from "antd";
import { useState } from "react";

export function useBucketAddModal() {
  const [visible, setVisible] = useState(false);
  const [cb, setCb] = useState<() => void>();
  const open = (onFinish?: () => void) => {
    setVisible(true);
    setCb(onFinish);
  };
  const close = () => setVisible(false);

  return { visible, open, close, onFinish: cb };
}

export function BucketAddModal({
  visible,
  onFinish,
  close,
}: {
  visible: boolean;
  open: () => void;
  onFinish?: () => void;
  close: () => void;
}) {
  const [form] = Form.useForm();

  const { loading, runAsync } = useRequest(
    async (values: any) => {
      const res = await api.bucket.addBucket(values);
      onFinish?.();
      close();
      return res;
    },
    { manual: true }
  );

  return (
    <Modal
      title="Add Bucket"
      open={visible}
      onCancel={close}
      okText="save"
      onOk={form.submit}
      loading={loading}
      centered
    >
      <Form form={form} onFinish={runAsync} layout="vertical">
        <Form.Item label="Bucket Name" name="name">
          <Input />
        </Form.Item>
        <Form.Item label="region" name="region">
          <Input />
        </Form.Item>
        <Form.Item label="Access Key" name={["access", "key"]}>
          <Input />
        </Form.Item>
        <Form.Item label="Access Secret" name={["access", "secret"]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
