import * as React from "react";
import {
  Form,
  Input,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';

interface Item {
  key: React.Key;
}

interface EditableCellProps<T extends Item> extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  record: T;
  index: number;
  rules: Array<any>;
  placeholder: string;
  children: React.ReactNode;
}

function EditableCell<T extends Item>({
  editing,
  dataIndex,
  title,
  record,
  index,
  children,
  rules,
  placeholder,
  ...restProps
}: EditableCellProps<T>) {
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            ...rules,
            {
              required: true,
              message: `Please Input ${title}!`,
            },
          ]}
        >
          <Input
            className="no-outline-on-error"
            placeholder={placeholder}
          />
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

export function EditableTable<T extends Item>(
  { data, setData, inputColumns, defaults, addTitle }: {
    data: Array<T>,
    setData: React.Dispatch<React.SetStateAction<Array<T>>>,
    inputColumns: Array<any>,
    defaults: T,
    addTitle: string,
  },
) {
  const [form] = Form.useForm();
  const [counter, setCounter] = React.useState(1);
  const [editingKey, setEditingKey] = React.useState<React.Key>('');

  const isEditing = (record: T) => record.key === editingKey;
  const addRecord = { ...defaults, key: '' };

  const edit = (record: Partial<T>) => {
    form.setFieldsValue({ ...defaults, ...record });
    setEditingKey(record.key);
  };

  const save = async (key: React.Key) => {
    try {
      const row = (await form.validateFields()) as T;

      const newData = [...data];
      const index = newData.findIndex(item => key === item.key);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, {
          ...item,
          ...row,
        });
        setData(newData);
        setEditingKey('');
      } else {
        row.key = key.toString();
        newData.push(row);
        setData(newData);
        setEditingKey('');
      }
      return true;
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
      return false;
    }
  };

  const remove = (record: Partial<T>) => {
    const newData = [...data];
    setData(newData.filter(item => item.key !== record.key));
  };

  const columns = [
    ...inputColumns,
    {
      title: 'Action',
      dataIndex: 'Action',
      width: '5%',
      render: (_: any, record: T) => {
        // special
        if (record.key === '') {
          return (
            <span>
              <Typography.Link
                disabled={editingKey !== ''}
                onClick={() => {
                  const wrap = async () => {
                    if (await save(counter)) {
                      form.setFieldsValue(addRecord);
                    }
                    setCounter(counter + 1);
                  };
                  wrap();
                }}
              >
                <Tooltip title={addTitle}>
                  <PlusOutlined/>
                </Tooltip>
              </Typography.Link>
            </span>
          );
        }
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Typography.Link
              onClick={() => {
                const wrap = async () => {
                  await save(record.key);
                  edit({ key: ''} as any); // TODO: remove any
                };
                wrap();
              }}
              style={{ marginRight: 8 }}
            >
              <CheckOutlined />
            </Typography.Link>
            <Typography.Link
              onClick={() => edit({ key: '' } as any)} // TODO: remove any
            >
              <CloseOutlined />
            </Typography.Link>
          </span>
        ) : (
          <span>
            <Typography.Link
              disabled={editingKey !== ''}
              onClick={() => edit(record)}
              style={{ marginRight: 8 }}
            >
              <EditOutlined />
            </Typography.Link>
            <Typography.Link
              disabled={editingKey !== ''}
              onClick={() => remove(record)}
            >
              <DeleteOutlined />
            </Typography.Link>
          </span>
        );
      },
    },
  ];

  const mergedColumns = columns.map(col => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: T) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record) && (col.editingCheck ? col.editingCheck(record) : true),
        rules: col.rules ? col.rules : [] as Array<any>,
        placeholder: col.placeholder,
      }),
    };
  });

  return (
    <Form form={form} component={false}>
      <Table
        components={{
          body: {
            cell: EditableCell,
          },
        }}
        dataSource={[...data, addRecord]}
        columns={mergedColumns}
        rowClassName="editable-row"
        pagination={false}
      />
    </Form>
  );
};

