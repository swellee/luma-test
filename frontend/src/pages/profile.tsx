import Header from "@/components/Header";
import {
  UpdateProfileModal,
  useUpdateProfileModal,
} from "@/components/update_profile_modal";
import { useUserStore } from "@/store/user_store";
import { UserOutlined, EditOutlined } from "@ant-design/icons";
import { Avatar, Tooltip, Typography } from "antd";

const { Title, Text } = Typography;
export default function Profile() {
  const user = useUserStore((state) => state.user);
  const editProps = useUpdateProfileModal();

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="w-1/2 card-bg rounded-xl flex flex-col sm:flex-row items-center gap-4">
        <Avatar
          size={96}
          icon={<UserOutlined />}
          src={user?.avatar}
          className="bg-sky-600 mb-2"
        />
        <div className="pl-0 sm:pl-2 text-center sm:text-left">
          <Title level={3} className="text-title text-xl! sm:text-2xl!">
            {user?.username}
            <Tooltip title="更新资料">
              <EditOutlined
                className="ml-2 text-title cursor-pointer"
                onClick={editProps.open}
              />
            </Tooltip>
          </Title>
          <Text className="text-gray-400 block text-sm sm:text-base">
            {user?.email}
          </Text>
        </div>
      </div>
      <UpdateProfileModal {...editProps} />
    </div>
  );
}
