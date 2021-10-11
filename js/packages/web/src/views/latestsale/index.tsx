import { Modal } from 'antd';
import { CustomSelect } from '../../components/CustomSelect/CustomSelect';
import { CustomPagination } from '../../components/Pagination/Pagination';
export const LatestsaleView = props => {
  const optionData = ['last 24 hour', 'last 7 days', 'last mount']
  const { handle_latest_sale } = props;
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
                <CustomSelect option={optionData} defoultParam="all time"/>
                {/* <a
                  className="btn btn-secondary w-100"
                  href="#"
                  role="button"
                  id="dropdownMenuLink"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <span>Last 7 days</span>{' '}
                  <i className="fa fa-angle-down" aria-hidden="true" />
                </a>
                <div
                  className="dropdown-menu"
                  aria-labelledby="dropdownMenuLink"
                >
                  <a className="dropdown-item" href="#">
                    Action
                  </a>
                  <a className="dropdown-item" href="#">
                    Another action
                  </a>
                  <a className="dropdown-item" href="#">
                    Something else here
                  </a>
                </div> */}
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
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img2.png"
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
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img3.png"
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
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img4.png"
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
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img5.png"
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
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img6.png"
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
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img7.png"
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
                  <tr>
                    <td>
                      <div className="media d-flex align-items-center">
                        <img
                          src="/images/item-img8.png"
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
