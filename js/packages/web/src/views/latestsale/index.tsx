import { Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustomSelect } from '../../components/CustomSelect';
import { useCollectionTokenMetadataList } from '../../hooks/useCollections';
export const LatestsaleView = props => {
  const [pageLen, setPageLen] = useState(90);
  const [items, setItems] = useState<any>();
  const optionData = ['last 24 hour', 'last 7 days', 'last mount'];
  const { handle_latest_sale } = props;
  const { id } = useParams<{ id: string }>();
  const { isLoading, collection, update } = useCollectionTokenMetadataList(id);
  useEffect(() => {
    const arr: any = [];
    if (collection) {
      collection.map(item => {
        arr.push(item.ParsedAccount);
      });
      setPageLen(arr.length);
      setItems(arr);
    }
  }, [collection]);
  return (
    <Modal
      width={1000}
      visible={true}
      footer={null}
      onCancel={handle_latest_sale}
      destroyOnClose={true}
    >
      {/* <Modal.Header closeButton></Modal.Header> */}

      <section id="latestsale-sec">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h3>Latest Sales</h3>
            </div>
          </div>
          <div className="row">
            <div className="col-md-3">
              <div className="dropdown mb-3">
                <CustomSelect
                  option={optionData}
                  defoultParam="all time"
                  onChange={() => {}}
                />
              </div>
            </div>
            <div className="col-md-9">
              <form className="card card-sm">
                <div className="card-body row no-gutters align-items-center p-0">
                  <div className="col-auto">
                    <i className="fa fa-search" aria-hidden="true" />
                  </div>
                  <div className="col">
                    <input className="form-control" type="search" />
                  </div>
                  <div className="col-auto">
                    <button
                      className="btn btn-secondary bg-transparent border-0"
                      type="submit"
                    >
                      <img src="/images/bar.png" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
      <section id="latestsale-body">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12 table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col" className="text-center">
                      Item
                    </th>
                    <th scope="col">Price</th>
                    <th scope="col">From</th>
                    <th scope="col">To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img1.png"
                          className="mr-3"
                          alt="..."
                          style={{ width: 60 }}
                        />
                        <div className="media-body">
                          <h5 className="card-title mb-1 ">Flying City</h5>
                          <p className="card-text m-0 pb-1">Ninjawolf</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a
                        href="#"
                        className="btn btn-primary price d-flex align-items-center pl-0"
                      >
                        <img src="/images/btn-user.png" className="mr-1" />{' '}
                        25.078
                      </a>
                    </td>
                    <td>Am5UrnkRd5p9xL7CWycGSTG...</td>
                    <td>@Am5UrnkRd5p9xL7CWycGSTG...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12">
              {/* <img src="/images/cubic-blur.png" className="cubic-blur1" /> */}
              {/* pagination starts */}
              <nav aria-label="..." className="mt-3 float-right">
                <ul className="pagination m-0 d-flex flex-wrap">
                  {/* <CustomPagination len={['s','s']} active={2}/> */}
                  <li className="page-item disabled">
                    <a
                      className="page-link"
                      href="#"
                      tabIndex={-1}
                      aria-disabled="true"
                    >
                      <i
                        className="fa fa-angle-left"
                        aria-hidden="true"
                        style={{ color: '#ccc' }}
                      />
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      1
                    </a>
                  </li>
                  <li className="page-item active" aria-current="page">
                    <a className="page-link" href="#">
                      2
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      3
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      4
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      ...
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      100
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      <i
                        className="fa fa-angle-right"
                        aria-hidden="true"
                        style={{ color: '#851CEF' }}
                      />
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </section>
    </Modal>
  );
};
