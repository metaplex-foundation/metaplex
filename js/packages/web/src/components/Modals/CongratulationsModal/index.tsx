import React from 'react';
import { Button } from "antd";

import { ModalLayout } from "../index";

interface CongratulationsProps {
  isModalVisible: boolean,
  title?: string,
  content?: string,
  buttonText?: string,
  onClickOk?: () => void,
  onClose: () => void,
  extraButtonText?: string | null,
  onClickExtraButton?: () => void,
}

const CongratulationsContent: React.FC<CongratulationsProps> = (
  {
    title,
    content,
    buttonText,
    onClickOk,
    onClose,
    extraButtonText,
    onClickExtraButton
  }) => {

  const handleClickOk = () => {
    if (onClickOk) onClickOk();
    onClose();
  }

  return (
    <div className="congratulations-root">
      <div className="emoji-frame">
        <img src="/modals/confetti-emoji.svg" />
      </div>
      <span className="title">{title || 'Congratulations'}</span>
      <span className="content">{content}</span>
      <Button className="ok-button" onClick={handleClickOk}>{buttonText || 'Ok'}</Button>
      {
        !!extraButtonText &&
        <Button className="extra-button" onClick={onClickExtraButton}>{extraButtonText}</Button>
      }
    </div>
  )
}

const CongratulationsModal: React.FC<CongratulationsProps> = ({ ...props }) => {
  return (
    <ModalLayout {...props}>
      <CongratulationsContent {...props} />
    </ModalLayout>
  )
}

export default CongratulationsModal;
