import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { strict as assert } from 'assert';

export const HashQueryLink = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function LinkPreservingHashQuery({ to, ...params }, ref) {
    assert(
      typeof to !== 'function',
      '`to` properties of type function are not supported',
    );

    const loc: LinkProps['to'] = typeof to === 'string' ? { pathname: to } : to;
    loc.hash = location.hash;
    return <Link to={loc} {...params} ref={ref} />;
  },
);
