import React from 'react-dom';
import { HEADER_CONTENT } from './data';
import { HeaderProps } from './interface';

const Header = ({ step, extraContent }: HeaderProps) => {
  const { title } = HEADER_CONTENT[step];

  return (
    <div className="create-pack-header">
      <p className="create-pack-header__title">{title}</p>
      {extraContent}
    </div>
  );
};

export default Header;
