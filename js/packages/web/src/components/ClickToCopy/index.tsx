import React, { useEffect, useState } from 'react';

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="feather feather-copy"
  >
    <rect
      stroke="currentColor"
      x="9"
      y="9"
      width="13"
      height="13"
      rx="2"
      ry="2"
    ></rect>
    <path
      stroke="currentColor"
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
    ></path>
  </svg>
);

const Checkmark = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="feather feather-check"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export const ClickToCopy = ({
  copyText,
  className,
}: {
  copyText: string;
  className: string;
}) => {
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClicked(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [clicked]);

  const onClick = () => {
    navigator.clipboard.writeText(copyText);
    setClicked(true);
  };

  return (
    <div className={className} onClick={onClick} title="Click to copy pubkey">
      {clicked ? <Checkmark /> : <CopyIcon />}
    </div>
  );
};
