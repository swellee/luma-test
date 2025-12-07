import { api } from "@/lib/api";
import { useRequest } from "ahooks";
import { Form, Input, message, Modal } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";

export function useBucketAddModal(bucketsRef:any) {
  const [visible, setVisible] = useState(false);
  const [onFinishCallback, setOnFinishCallback] = useState<() => void>();
  
  const open = (onFinish?: () => void) => {
    setVisible(true);
    setOnFinishCallback(() => onFinish);
  };
  
  const close = () => {
    setVisible(false);
    setOnFinishCallback(undefined);
  };

  return { 
    visible, 
    open, 
    close,
    onFinish: onFinishCallback,
    bucketsRef,
  };
}

export function BucketAddModal({
  visible,
  onFinish,
  close,
  open,
  bucketsRef,
}: {
  visible: boolean;
  open: () => void;
  onFinish?: () => void;
  close: () => void;
  bucketsRef: any;
}) {
  const [form] = Form.useForm();
  const { loading, runAsync } = useRequest(
    async (values: any) => {
      try {
        const res = await api.bucket.addBucket(values);
        if(res) {
          message.success("添加成功");
        }
        // 先关闭模态框
        close();
        // 然后调用 onFinish 回调
        if (onFinish) {
          onFinish();
        } else {
          bucketsRef.current?.refresh();
        }
        return res;
      } catch (error) {
        // 如果 API 调用失败，不关闭模态框
        throw error;
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
