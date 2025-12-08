import {
  Divider,
  Form,
  FormInstance,
  Input,
  Modal,
  Select,
  Typography,
} from "antd";
import { useUserStore } from "@/store/user_store";
import { useState } from "react";
import ImageUpload from "./ImageUpload";
import { api } from "@/lib/api";
import { roleOpts } from "@/lib/consts";
import { User } from "@/lib/types";

export function useUpdateProfileModal() {
  const self = useUserStore((state) => state.user);
  const [visible, setVisible] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<(() => void) | null>(null);
  const [form] = Form.useForm();
  const allowAdmin = self?.role === "admin";
  
  const open = (user?: User): Promise<void> => {
    setVisible(true);
    setIsSelf(user?.id === self?.id);
    form.setFieldsValue({
      username: user?.username,
      avatar: user?.avatar,
      role: user?.role,
      id: user?.id,
    });
    
    // 返回一个 Promise，当 Modal 完成时 resolve
    return new Promise<void>((resolve) => {
      setResolvePromise(() => resolve);
    });
  };
  
  const close = () => {
    setVisible(false);
    // 如果 Modal 被关闭而没有完成，也 resolve promise
    if (resolvePromise) {
      resolvePromise();
      setResolvePromise(null);
    }
  };

  return {
    visible,
    open,
    close,
    form,
    isSelf,
    resolvePromise,
    allowAdmin,
  };
}

export function UpdateProfileModal({
  visible,
  isSelf,
  close,
  form,
  resolvePromise,
  allowAdmin,
}: {
  visible: boolean;
  isSelf: boolean;
  close: () => void;
  resolvePromise: (() => void) | null;
  form: FormInstance;
  allowAdmin: boolean;
}) {
  const setUser = useUserStore((state) => state.setUser);
  const onDeleteAvatar = async (file: string) => {
    // 删除头像后，先保存一次
    const values = await form.validateFields();
    await api.user.updateProfile({ ...values, avatar: "" });
  };
  const onFinish = async (values: any) => {
    const res = await api.user.updateProfile(values);
    if (res && isSelf) {
      setUser(res);
    }
    close();
    // 调用 resolve 函数来通知 Promise 已完成
    if (resolvePromise) {
      resolvePromise();
    }
  };

  return (
    <Modal
      title="Update Profile"
      open={visible}
      onCancel={close}
      onOk={form.submit}
      okText="Save"
      cancelText="Cancel"
    >
      <Divider />
      <Form
        form={form}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <div className="flex flex-col items-center justify-center">
          <Typography.Title level={3} className="text-center mb-4">
            Avatar
          </Typography.Title>
          <Form.Item name="avatar">
            <ImageUpload
              width={160}
              height={160}
              maxCount={1}
              onDeleteImg={onDeleteAvatar}
              listType="picture-circle"
            />
          </Form.Item>
        </div>
        <Form.Item noStyle name="id" />
        <Form.Item
          label="Nickname"
          name="username"
          rules={[{ required: true, message: "Please enter nickname" }]}
        >
          <Input placeholder="Please enter nickname" />
        </Form.Item>
        <Form.Item
          label="Role"
          name="role"
          rules={[{ required: true, message: "Please select a role" }]}
        >
          <Select
            options={roleOpts(allowAdmin)}
            placeholder="Please select a role"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
