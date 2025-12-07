import { Modal } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";

export function useFinishAnnotateModal(onMarkDone: () => void) {
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

export function FinishAnnotateModal({
  show,
  close,
  onMarkDone,
}: {
  show: boolean;
  close: () => void;
  onMarkDone: () => void;
}) {
  const onOk = () => {
    onMarkDone();
    close();
  };
  return (
    <Modal
      open={show}
      title="Whole Task Finished"
      okText="mark task done"
      cancelText="back to list"
      maskClosable={false} // prevent closing by clicking outside
      onOk={onOk}
      centered
      onCancel={close}
    >
      <p>Congrats!</p>
      <p>You have finished this task! Thank you for annotating!</p>
    </Modal>
  );
}
