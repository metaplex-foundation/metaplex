import React from 'react-dom';
import { HEADER_CONTENT } from './data';
import { HeaderProps } from './interface';

const Header = ({ step }: HeaderProps) => {
  const { title } = HEADER_CONTENT[step];

  return (
    <div className="create-pack-header">
      <p className="create-pack-header__title">{title}</p>
    </div>
  );
};

export default Header;
