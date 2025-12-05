import AdminBuckets from "@/components/admin/bucket_list";
import AdminPackageList from "@/components/admin/package_list";
import { Button, Tabs } from "antd";
import { BucketAddModal, useBucketAddModal } from "../bucket_add_modal";
import { PackageAddModal, usePackageAddModal } from "../package_add_modal";

export default function AdminPackages() {
  const bucketModalProps = useBucketAddModal();
  const packageModalProps = usePackageAddModal(bucketModalProps.open);
  return (
    <div className="p-4">
      <h1 className="text-2xl! text-green-900 font-bold mb-4 flex items-center">Package Management
        <Button className="ml-auto" onClick={()=>bucketModalProps.open()}>
          add bucket
        </Button>
        <Button type="primary" className="ml-2" onClick={()=>packageModalProps.open()}>
          add package
        </Button>
      </h1>
      <Tabs defaultActiveKey="packages" items={[
        {
          label: "Buckets",
          key: "buckets",
          children: <AdminBuckets />,
        },
        {
          label: "Packages",
          key: "packages",
          children: <AdminPackageList />,
        }
      ]}/>
      <BucketAddModal {...bucketModalProps} />
      <PackageAddModal {...packageModalProps} />
    </div>
  );
}