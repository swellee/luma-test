import React, { useEffect, useMemo, useState } from "react";
import { message, Modal, Upload } from "antd";
import type { GetProp, UploadFile, UploadProps } from "antd";
import ImgCrop from "antd-img-crop";
import { api } from "@/lib/api";
import { UploadOutlined } from "@ant-design/icons";
import { cn } from "@/lib/util";
import "./ImageUpload.scss";
type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

const ImageUpload = ({
  value,
  aspect = 3/4, //default 3/4, possible values: 2/3,4/3, 16/9, 9/16 ...
  maxCount = 1,
  width = 60,
  height = 60,
  onChange,
  onDeleteImg,
  className,
  style,
  listType = "picture-card",
}: {
  value?: string | string[];
  aspect?: number;
  width?: number;
  height?: number;
  maxCount?: number;
  onChange?: (value: string | string[]) => void;
  onDeleteImg?: (file: string) => void;
  className?: string;
  style?: React.CSSProperties;
  listType?: "picture-card" | "picture-circle";
}) => {
  aspect ||= width / height;
  style = Object.assign({}, style, { width, height });
  const [previewImage, setPreviewImage] = useState("");

  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (value) {
      setFileList((fileList) => {
        if (Array.isArray(value)) {
          return value.map((v) => ({
            uid: v,
            name: v,
            url: v,
            status: "done",
          }));
        } else {
          return [
            {
              uid: value,
              name: value,
              url: value,
            },
          ];
        }
      });
    }
  }, [value]);

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    // onChange?.(newFileList.map((f) => f.url!));
  };

  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    const isLt3_5M = file.size / 1024 / 1024 < 3.5;
    if (!isLt3_5M) {
      message.error("图片大小不能超过 3.5MB!");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const onPreview = async (file: UploadFile) => {
    let src = file.url as string;
    if (!src) {
      src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj as FileType);
        reader.onload = () => resolve(reader.result as string);
      });
    }
    setPreviewImage(src);
  };
  const [deleteFile, setDeleteFile] = useState<UploadFile | null>(null);
  const onRemove = (file: UploadFile) => {
    setDeleteFile(file);
    return false;
  };
  const handleDelete = async () => {
    const index = fileList.indexOf(deleteFile!);
    const newFileList = fileList.slice();
    const res = await api.file.deleteFile(deleteFile!.name!);
    if (res?.success) {
      onDeleteImg?.(deleteFile!.name);
      newFileList.splice(index, 1);
      setFileList(newFileList);
      setDeleteFile(null);
    }
  };

  const children = useMemo(() => {
    const defaultEle = <UploadOutlined />;
    if (!fileList || !maxCount) return defaultEle;
    if (fileList.length >= maxCount) return null;
    return defaultEle;
  }, [fileList, maxCount]);

  return (
    <div
      style={{
        "--img-upload-width": width + "px",
        "--img-upload-height": height + "px",
      }}
    >
      <ImgCrop rotationSlider aspect={aspect} fillColor="transparent">
        <Upload
          listType={listType}
          fileList={fileList}
          onChange={handleChange}
          onPreview={onPreview}
          onRemove={onRemove}
          beforeUpload={beforeUpload}
          className={cn(
            "img-upload",
            "w-(--img-upload-width) h-(--img-upload-height)",
            className
          )}
          customRequest={async ({ file, onSuccess, onError }) => {
            console.log("customRequest", file);
            try {
              const res = await api.file.uploadFile(file as File);
              console.log("res", res);
              const idx = fileList.findIndex(
                (f) => f.uid === (file as any).uid
              );
              if (idx >= 0) {
                fileList[idx] = {
                  url: res.url,
                  status: "done",
                  uid: res.hash,
                  name: res.key,
                };
              }
              const newList = [...fileList];
              setFileList(newList);
              onChange?.(
                maxCount === 1
                  ? res.url
                  : newList
                      .map((_) => _.url)
                      .filter((url): url is string => url !== undefined)
              );
            } catch (error) {
              onError?.({
                status: 500,
                url: "",
                method: "POST",
                name: "error",
                message: "上传失败",
              });
              message.error("上传失败");
              onChange?.([]);
            }
          }}
        >
          {children}
        </Upload>
      </ImgCrop>
      <Modal
        open={!!previewImage}
        title="预览图片"
        footer={null}
        onCancel={() => setPreviewImage("")}
      >
        <img alt="preview" style={{ width: "100%" }} src={previewImage} />
      </Modal>
      <Modal
        open={!!deleteFile}
        title="确定删除？"
        centered
        okText="确定"
        cancelText="取消"
        width={300}
        onOk={handleDelete}
        onCancel={() => setDeleteFile(null)}
      />
    </div>
  );
};

export default ImageUpload;
