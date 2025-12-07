import { TaskStatus } from "@/lib/types";
import { Button, Modal, Radio } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";

export function useFinishReviewModal(onMarkDone: (status: TaskStatus) => void) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const open = () => setShow(true);
  const close = () => {
    setShow(false);
    navigate(-1);
  };

  return {
    show,
    open,
    close,
    onMarkDone,
  };
}

export function FinishReviewModal({
  show,
  close,
  onMarkDone,
}: {
  show: boolean;
  close: () => void;
  onMarkDone: (status: TaskStatus) => void;
}) {
  const [result, setResult] = useState<TaskStatus>(TaskStatus.approved);
  const onOk = () => {
    onMarkDone(result);
    close();
  };
  return (
    <Modal
      open={show}
      title="Whole Task Finished"
      maskClosable={false} // prevent closing by clicking outside
      onCancel={close}
      onOk={onOk}
      centered
      okText="SAVE"
      cancelText="NOT NOW"
    >
      <p>Congrats!</p>
      <p>You have finished this task! Thank you for review!</p>
      <p>How will you mark the annotator's work?</p>
      <Radio.Group
        options={[
          {
            label: "Approved",
            value: TaskStatus.approved,
          },
          {
            label: "Rejected",
            value: TaskStatus.rejected,
          },
        ]}
        onChange={(e) => setResult(e.target.value as TaskStatus)}
        value={result}
      />
    </Modal>
  );
}
