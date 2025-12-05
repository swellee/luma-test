import { Divider, Form, FormInstance, Input, Modal, Select, Typography } from "antd";
import {useUserStore} from "@/store/user_store";
import { useState } from "react";
import ImageUpload from "./ImageUpload";
import { api } from "@/lib/api";
import { roleOpts } from "@/lib/consts";

export function useUpdateProfileModal() {
  const user = useUserStore((state) => state.user);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const allowAdmin = user?.role === "admin";
  const open = () => {
    setVisible(true);
    form.setFieldsValue({
      username: user?.username,
      avatar: user?.avatar,
      role: user?.role,
    });
  };
  const close = () => {
    setVisible(false);
  };

  return {
    visible,
    open,
    close,
    form,
    allowAdmin,
  };
}

export function UpdateProfileModal({
  visible,
  close,
  form,
  allowAdmin,
}: {
  visible: boolean;
  close: () => void;
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
    if (res) {
      setUser(res);
      close();
    }
  };

  return (
    <Modal
      title="更新资料"
      open={visible}
      onCancel={close}
      onOk={form.submit}
      okText="保存"
      cancelText="取消"
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
            头像
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
        <Form.Item
          label="昵称"
          name="username"
          rules={[{ required: true, message: "请输入昵称" }]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>
         <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select options={roleOpts(allowAdmin)} placeholder="Please select a role" />
            </Form.Item>
      </Form>
    </Modal>
  );
}
