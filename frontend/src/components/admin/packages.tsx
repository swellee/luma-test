import { AdminBuckets } from "@/components/admin/bucket_list";
import { AdminPackageList } from "@/components/admin/package_list";
import { Button, Tabs } from "antd";
import { BucketAddModal, useBucketAddModal } from "../bucket_add_modal";
import { PackageAddModal, usePackageAddModal } from "../package_add_modal";
import React from "react";

export default function AdminPackages() {
  const bucketsRef = React.useRef<{ refresh: () => void }>(null);
  const packagesRef = React.useRef<{ refresh: () => void }>(null);
  const bucketModalProps = useBucketAddModal();
  const packageModalProps = usePackageAddModal(bucketModalProps.open);

  return (
    <div className="p-4">
      <h1 className="text-2xl! text-green-900 font-bold mb-4 flex items-center">
        Package Management
        <Button
          className="ml-auto"
          onClick={() => {
            bucketModalProps.open().then(() => {
              // refresh buckets
              bucketsRef.current?.refresh();
            });
          }}
        >
          add bucket
        </Button>
        <Button
          type="primary"
          className="ml-2"
          onClick={() => {
            packageModalProps.open().then(() => {
              // refresh packages
              packagesRef.current?.refresh();
            });
          }}
        >
          add package
        </Button>
      </h1>
      <Tabs
        defaultActiveKey="packages"
        items={[
          {
            label: "Buckets",
            key: "buckets",
            children: <AdminBuckets ref={bucketsRef} />,
          },
          {
            label: "Packages",
            key: "packages",
            children: <AdminPackageList ref={packagesRef} />,
          },
        ]}
      />
      <BucketAddModal {...bucketModalProps} />
      <PackageAddModal {...packageModalProps} />
    </div>
  );
}
