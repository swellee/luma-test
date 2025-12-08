import { api } from "@/lib/api";
import { useRequest } from "ahooks";
import { Form, Input, message, Modal } from "antd";
import { useState } from "react";

export function useBucketAddModal() {
  const [visible, setVisible] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<() => void>();
  const [rejectPromise, setRejectPromise] = useState<() => void>();
  const open = (): Promise<void> => {
    setVisible(true);
    return new Promise<void>((resolve, reject) => {
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
    onResolve: resolvePromise,
    onReject: rejectPromise,
  };
}

export function BucketAddModal({
  visible,
  onReject,
  onResolve,
  close,
  open,
}: {
  visible: boolean;
  open: () => void;
  onResolve?: () => void;
  onReject?: () => void;
  close: () => void;
}) {
  const [form] = Form.useForm();
  const { loading, runAsync } = useRequest(
    async (values: any) => {
      try {
        const res = await api.bucket.addBucket(values);
        if (res) {
          message.success("添加成功");
        }
        // 先关闭模态框
        close();
        // 然后调用 onFinish 回调
        if (onResolve) {
          onResolve();
        }
        return res;
      } catch (error) {
        // 如果 API 调用失败，不关闭模态框
        onReject?.();
      }
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
