import React, { FC } from 'react'
import CN from 'classnames'
import { Upload } from 'antd'
import { Button } from '../../atoms'
import { UploadOutlined } from '@ant-design/icons'

export interface FileUploadProps {
  [x: string]: any
}

export const FileUpload: FC<FileUploadProps> = ({
  className,
  onChange,
  action,
  name,
  ...restProps
}: FileUploadProps) => {
  const FileUploadClasses = CN(`file-upload`, className)

  const props = {
    name: name || 'file',
    action: action || '',
    headers: {
      authorization: 'authorization-text',
    },
    onChange(info: any) {
      onChange(info)
    },
  }

  return (
    <div className={FileUploadClasses} {...restProps}>
      <Upload {...props}>
        <Button
          appearance='secondary'
          view='outline'
          iconBefore={<i className='ri-upload-cloud-2-line text-lg' />}>
          Attach file
        </Button>
      </Upload>
    </div>
  )
}

export default FileUpload
