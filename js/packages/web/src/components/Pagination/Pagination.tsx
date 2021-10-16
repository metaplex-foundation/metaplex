import React from 'react';
import ReactPaginate from 'react-paginate';

interface DataType {
  len: number;
  active: number;
  changePage: (event: object) => void;
}

export const CustomPagination = ({ len, active, changePage }: DataType) => {
  return (
    <>
      {len ?
        <ReactPaginate
          previousLabel={'<'}
          nextLabel={'>'}
          disableInitialCallback={true}
          forcePage={active}
          pageCount={len}
          onPageChange={event => changePage(event)}
        />:''
      }
    </>
  );
};
