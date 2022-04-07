import React, { useEffect, useState, useCallback } from 'react'
import { Steps, Row, Upload, Statistic, Spin, Form, Typography, Card } from 'antd'
import { ArtCard } from './../../components/ArtCard'
import { UserSearch, UserValue } from './../../components/UserSearch'
import { Confetti } from './../../components/Confetti'
import { mintNFT } from '../../actions'
import {
  MAX_METADATA_LEN,
  useConnection,
  IMetadataExtension,
  MetadataCategory,
  useConnectionConfig,
  Creator,
  shortenAddress,
  MetaplexModal,
  MetaplexOverlay,
  MetadataFile,
  StringPublicKey,
  WRAPPED_SOL_MINT,
  getAssetCostToStore,
  LAMPORT_MULTIPLIER,
  Button,
  TextField,
  BuyCard,
  CheckBox,
  TextArea,
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
} from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import { MintLayout } from '@solana/spl-token'
import { useHistory, useParams } from 'react-router-dom'
import { getLast } from '../../utils/utils'
import { AmountLabel } from '../../components/AmountLabel'
import useWindowDimensions from '../../utils/layout'
import { LoadingOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useTokenList } from '../../contexts/tokenList'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'
import { ArtSelector } from '../auctionCreate/artSelector'
// import { createTokenForNft } from '../../api'

const { Step } = Steps
const { Dragger } = Upload
const { Text } = Typography

export const ArtCreateView = () => {
  const connection = useConnection()
  const { endpoint } = useConnectionConfig()
  const wallet = useWallet()
  const [alertMessage, setAlertMessage] = useState<string>()
  const { step_param }: { step_param: string } = useParams()
  const history = useHistory()
  const { width } = useWindowDimensions()
  const [nftCreateProgress, setNFTcreateProgress] = useState<number>(0)

  const [step, setStep] = useState<number>(0)
  const [stepsVisible, setStepsVisible] = useState<boolean>(true)
  const [isMinting, setMinting] = useState<boolean>(false)
  const [nft, setNft] = useState<{ metadataAccount: StringPublicKey } | undefined>(undefined)
  const [files, setFiles] = useState<File[]>([])
  const [isCollection, setIsCollection] = useState<boolean>(false)
  const [attributes, setAttributes] = useState<IMetadataExtension>({
    name: '',
    symbol: '',
    collection: '',
    description: '',
    external_url: '',
    image: '',
    animation_url: undefined,
    attributes: undefined,
    tag: '',
    seller_fee_basis_points: 0,
    creators: [],
    properties: {
      files: [],
      category: MetadataCategory.Image,
    },
  })

  const gotoStep = useCallback(
    (_step: number) => {
      history.push(`/art/create/${_step.toString()}`)
      if (_step === 0) setStepsVisible(true)
    },
    [history]
  )

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param))
    else gotoStep(0)
  }, [step_param, gotoStep])

  // store files
  const mint = async () => {
    const metadata = {
      name: attributes.name,
      symbol: attributes.symbol,
      creators: attributes.creators,
      collection: attributes.collection,
      description: attributes.description,
      sellerFeeBasisPoints: attributes.seller_fee_basis_points,
      image: attributes.image,
      animation_url: attributes.animation_url,
      attributes: attributes.attributes,
      tag: attributes.tag,
      external_url: attributes.external_url,
      properties: {
        files: attributes.properties.files,
        category: attributes.properties?.category,
      },
    }
    setStepsVisible(false)
    setMinting(true)

    try {
      const _nft = await mintNFT(
        connection,
        wallet,
        endpoint.name,
        files,
        metadata,
        setNFTcreateProgress,
        attributes.properties?.maxSupply
      )

      // if (_nft && _nft.metadataAccount) {
      //   await createTokenForNft(_nft.metadataAccount, metadata.tag, metadata)
      // }

      if (_nft) setNft(_nft)
      setAlertMessage('')
    } catch (e: any) {
      setAlertMessage(e.message)
    } finally {
      setMinting(false)
    }
  }

  return (
    <>
      <div className='flex w-full pt-[80px] pb-[100px]'>
        <div className='container flex gap-[32px]'>
          <div className='sidebar w-[260px] flex-shrink-0 rounded'>
            <Steps progressDot direction={width < 768 ? 'horizontal' : 'vertical'} current={step}>
              <Step title='Category' />
              <Step title='Upload' />
              <Step title='Info' />
              <Step title='Royalties' />
              <Step title='Launch' />
            </Steps>
          </div>

          <div className='content-wrapper flex w-full flex-col gap-[28px]'>
            {step === 0 && (
              <CategoryStep
                confirm={(category: MetadataCategory) => {
                  setAttributes({
                    ...attributes,
                    properties: {
                      ...attributes.properties,
                      category,
                    },
                  })
                  gotoStep(1)
                }}
              />
            )}

            {step === 1 && (
              <UploadStep
                attributes={attributes}
                setAttributes={setAttributes}
                files={files}
                setFiles={setFiles}
                confirm={() => gotoStep(2)}
              />
            )}

            {step === 2 && (
              <InfoStep
                attributes={attributes}
                files={files}
                isCollection={isCollection}
                setIsCollection={setIsCollection}
                setAttributes={setAttributes}
                confirm={() => gotoStep(3)}
              />
            )}

            {step === 3 && (
              <RoyaltiesStep
                attributes={attributes}
                confirm={() => gotoStep(4)}
                setAttributes={setAttributes}
              />
            )}

            {step === 4 && (
              <LaunchStep
                attributes={attributes}
                files={files}
                confirm={() => gotoStep(5)}
                connection={connection}
              />
            )}
            {step === 5 && (
              <WaitingStep
                mint={mint}
                minting={isMinting}
                step={nftCreateProgress}
                confirm={() => gotoStep(6)}
              />
            )}

            {0 < step && step < 5 && (
              <div className='flex max-w-[700px]'>
                <Button
                  appearance='secondary'
                  view='outline'
                  isRounded={false}
                  onClick={() => gotoStep(step - 1)}>
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MetaplexOverlay visible={step === 6}>
        <Congrats nft={nft} alert={alertMessage} />
      </MetaplexOverlay>
    </>
  )
}

const CategoryStep = (props: { confirm: (category: MetadataCategory) => void }) => {
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[12px]'>
          <h2 className='text-h3'>Create a new item</h2>
          <p className='text-md'>
            First time creating on Metaplex?{' '}
            <a
              href='https://docs.metaplex.com/storefront/create'
              target='_blank'
              rel='noreferrer'
              className='text-B-500'>
              Read our creators’ guide.
            </a>
          </p>
        </div>
      </div>

      <div className='flex'>
        <Button
          size='lg'
          appearance='neutral'
          onClick={() => props.confirm(MetadataCategory.Image)}
          className='w-[200px]'>
          <div className='flex flex-col items-center'>
            <div>Image</div>
            <div className='text-sm'>JPG, PNG, GIF</div>
          </div>
        </Button>
      </div>
    </>
  )
}

const UploadStep = (props: {
  attributes: IMetadataExtension
  setAttributes: (attr: IMetadataExtension) => void
  files: File[]
  setFiles: (files: File[]) => void
  confirm: () => void
}) => {
  const [coverFile, setCoverFile] = useState<File | undefined>(props.files?.[0])
  const [mainFile, setMainFile] = useState<File | undefined>(props.files?.[1])
  const [coverArtError, setCoverArtError] = useState<string>()

  const [customURL, setCustomURL] = useState<string>('')
  const [customURLErr, setCustomURLErr] = useState<string>('')
  const disableContinue = !(coverFile || (!customURLErr && !!customURL))

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      properties: {
        ...props.attributes.properties,
        files: [],
      },
    })
  }, [])

  const uploadMsg = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return 'Upload your audio creation (MP3, FLAC, WAV)'
      case MetadataCategory.Image:
        return 'Upload your image creation (PNG, JPG, GIF)'
      case MetadataCategory.Video:
        return 'Upload your video creation (MP4, MOV, GLB)'
      case MetadataCategory.VR:
        return 'Upload your AR/VR creation (GLB)'
      case MetadataCategory.HTML:
        return 'Upload your HTML File (HTML)'
      default:
        return 'Please go back and choose a category'
    }
  }

  const acceptableFiles = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return '.mp3,.flac,.wav'
      case MetadataCategory.Image:
        return '.png,.jpg,.gif'
      case MetadataCategory.Video:
        return '.mp4,.mov,.webm'
      case MetadataCategory.VR:
        return '.glb'
      case MetadataCategory.HTML:
        return '.html'
      default:
        return ''
    }
  }

  const { category } = props.attributes.properties

  const urlPlaceholder = `http://example.com/path/to/${
    category === MetadataCategory.Image ? 'image' : 'file'
  }`

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[16px]'>
          <h2 className='text-h3'>Now, let&apos;s upload your creation</h2>
          <p className='text-md'>
            Your file will be uploaded to the decentralized web via Arweave. Depending on file type,
            can take up to 1 minute. Arweave is a new type of storage that backs data with
            sustainable and perpetual endowments, allowing users and developers to truly store data
            forever – for the very first time.
          </p>
        </div>

        <div className='flex flex-col gap-[16px]'>
          <h4 className='text-h6 font-500'>Upload a cover image</h4>

          <div className='flex w-full flex-col gap-[40px]'>
            <Dragger
              accept='.png,.jpg,.gif,.mp4,.svg'
              className='!w-full !max-w-full !border !border-slate-200 !bg-slate-10 !px-[20px]'
              multiple={false}
              onRemove={() => {
                setMainFile(undefined)
                setCoverFile(undefined)
              }}
              customRequest={info => {
                // dont upload files here, handled outside of the control
                info?.onSuccess?.({}, null as any)
              }}
              fileList={coverFile ? [coverFile as any] : []}
              onChange={async info => {
                const file = info.file.originFileObj

                if (!file) {
                  return
                }

                const sizeKB = file.size / 1024

                if (sizeKB < 25) {
                  setCoverArtError(
                    `The file ${file.name} is too small. It is ${
                      Math.round(10 * sizeKB) / 10
                    }KB but should be at least 25KB.`
                  )
                  return
                }

                setCoverFile(file)
                setCoverArtError(undefined)
              }}>
              <div className='flex w-full justify-center'>
                <h3 className='text-base font-500'>(PNG, JPG, GIF, SVG)</h3>
              </div>

              {coverArtError ? (
                <Text type='danger'>{coverArtError}</Text>
              ) : (
                <p className='text-slate-600'>Drag and drop, or click to browse</p>
              )}
            </Dragger>
          </div>
        </div>

        {props.attributes.properties?.category !== MetadataCategory.Image && (
          <div className='flex max-w-[700px] flex-col gap-[40px]'>
            <h3>{uploadMsg(props.attributes.properties?.category)}</h3>
            <Dragger
              accept={acceptableFiles(props.attributes.properties?.category)}
              className='!w-full !max-w-full !border !border-slate-200 !bg-slate-10 !px-[20px]'
              multiple={false}
              customRequest={info => {
                // dont upload files here, handled outside of the control
                info?.onSuccess?.({}, null as any)
              }}
              fileList={mainFile ? [mainFile as any] : []}
              onChange={async info => {
                const file = info.file.originFileObj

                // Reset image URL
                setCustomURL('')
                setCustomURLErr('')

                if (file) setMainFile(file)
              }}
              onRemove={() => {
                setMainFile(undefined)
              }}>
              <div className='ant-upload-drag-icon'>
                <h3 style={{ fontWeight: 700 }}>Upload your creation</h3>
              </div>
              <p className='ant-upload-text' style={{ color: '#6d6d6d' }}>
                Drag and drop, or click to browse
              </p>
            </Dragger>
          </div>
        )}

        <div className='flex w-full flex-col'>
          <TextField
            label='OR use absolute URL to content'
            placeholder={urlPlaceholder}
            hint={customURLErr}
            isError={customURLErr !== ''}
            disabled={!!mainFile}
            value={customURL}
            onChange={ev => setCustomURL(ev.target.value)}
            onFocus={() => setCustomURLErr('')}
            onBlur={() => {
              if (!customURL) {
                setCustomURLErr('')
                return
              }

              try {
                // Validate URL and save
                new URL(customURL)
                setCustomURL(customURL)
                setCustomURLErr('')
              } catch (e) {
                console.error(e)
                setCustomURLErr('Please enter a valid absolute URL')
              }
            }}
          />
        </div>

        <div className='flex items-center'>
          <Button
            appearance='neutral'
            size='lg'
            disabled={disableContinue}
            isRounded={false}
            onClick={async () => {
              props.setAttributes({
                ...props.attributes,
                properties: {
                  ...props.attributes.properties,
                  files: [coverFile, mainFile, customURL]
                    .filter(f => f)
                    .map(f => {
                      const uri = typeof f === 'string' ? f : f?.name || ''
                      const type =
                        typeof f === 'string' || !f
                          ? 'unknown'
                          : f.type || getLast(f.name.split('.')) || 'unknown'

                      return {
                        uri,
                        type,
                      } as MetadataFile
                    }),
                },
                image: coverFile?.name || customURL || '',
                animation_url:
                  props.attributes.properties?.category !== MetadataCategory.Image && customURL
                    ? customURL
                    : mainFile && mainFile.name,
              })
              const url = await fetch(customURL).then(res => res.blob())
              const files = [
                coverFile,
                mainFile,
                customURL ? new File([url], customURL) : '',
              ].filter(f => f) as File[]

              props.setFiles(files)
              props.confirm()
            }}>
            Continue to Mint
          </Button>
        </div>
      </div>
    </>
  )
}

interface Royalty {
  creatorKey: string
  amount: number
}

const useArtworkFiles = (files: File[], attributes: IMetadataExtension) => {
  const [data, setData] = useState<{ image: string; animation_url: string }>({
    image: '',
    animation_url: '',
  })

  useEffect(() => {
    if (attributes.image) {
      const file = files.find(f => f.name === attributes.image)
      if (file) {
        const reader = new FileReader()
        reader.onload = function (event) {
          setData((data: any) => {
            return {
              ...(data || {}),
              image: (event.target?.result as string) || '',
            }
          })
        }
        if (file) reader.readAsDataURL(file)
      }
    }

    if (attributes.animation_url) {
      const file = files.find(f => f.name === attributes.animation_url)
      if (file) {
        const reader = new FileReader()
        reader.onload = function (event) {
          setData((data: any) => {
            return {
              ...(data || {}),
              animation_url: (event.target?.result as string) || '',
            }
          })
        }
        if (file) reader.readAsDataURL(file)
      }
    }
  }, [files, attributes])

  return data
}

const InfoStep = (props: {
  attributes: IMetadataExtension
  files: File[]
  isCollection: boolean
  setIsCollection: (val: boolean) => void
  setAttributes: (attr: IMetadataExtension) => void
  confirm: () => void
}) => {
  const { image } = useArtworkFiles(props.files, props.attributes)
  const [form] = Form.useForm()
  const { isCollection, setIsCollection } = props
  const [selectedCollection, setSelectedCollection] = useState<Array<SafetyDepositDraft>>([])

  const artistFilter = useCallback(
    (i: SafetyDepositDraft) =>
      !(i.metadata.info.data.creators || []).some((c: Creator) => !c.verified),
    []
  )

  const handleTagChange = ({ key }) => {
    props.setAttributes({ ...props.attributes, tag: key })
  }

  useEffect(() => {
    if (selectedCollection.length) {
      props.setAttributes({
        ...props.attributes,
        collection: selectedCollection[0].metadata.info.mint,
      })
    }
  }, [selectedCollection])

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[12px]'>
          <h2 className='text-h3'>Describe your item</h2>
          <p className='text-md'>
            Provide detailed description of your creative process to engage with your audience.
          </p>
        </div>

        {props.attributes.image && (
          <div className='flex w-full'>
            <BuyCard className='w-[300px]' image={image} name={props.attributes.name} />
          </div>
        )}
      </div>

      <div className='flex max-w-[700px] flex-col gap-[20px]'>
        <div className='flex flex-col gap-[16px]'>
          <TextField
            label='Title'
            placeholder='Max 50 characters'
            maxLength={50}
            value={props.attributes.name}
            onChange={info =>
              props.setAttributes({
                ...props.attributes,
                name: info.target.value,
              })
            }
          />
          <TextField
            label='Symbol'
            placeholder='Max 10 characters'
            maxLength={10}
            value={props.attributes.symbol}
            onChange={info =>
              props.setAttributes({
                ...props.attributes,
                symbol: info.target.value,
              })
            }
          />
        </div>

        <div className='flex'>
          <CheckBox
            checked={isCollection}
            onChange={val => {
              setIsCollection(val.target.checked)
            }}>
            Is parent collection?
          </CheckBox>
        </div>

        {!isCollection && (
          <div className='flex flex-col gap-[12px]'>
            <h4 className='text-h6 font-500'>Collection</h4>
            <ArtSelector
              filter={artistFilter}
              selected={selectedCollection}
              setSelected={items => {
                setSelectedCollection(items)
              }}
              allowMultiple={false}>
              Select NFT
            </ArtSelector>
          </div>
        )}

        <div className='flex flex-col gap-[12px]'>
          <TextArea
            label='Description'
            placeholder='Max 500 characters'
            maxLength={500}
            value={props.attributes.description}
            onChange={info =>
              props.setAttributes({
                ...props.attributes,
                description: info.target.value,
              })
            }
          />
        </div>

        <div className='flex flex-col gap-[12px]'>
          {!isCollection && (
            <TextField
              label='Maximum Supply'
              placeholder='Quantity'
              value={props.attributes.properties.maxSupply}
              onChange={val => {
                props.setAttributes({
                  ...props.attributes,
                  properties: {
                    ...props.attributes.properties,
                    maxSupply: val.target.value,
                  },
                })
              }}
              type='number'
            />
          )}
        </div>

        <div className='flex flex-col gap-[16px]'>
          <h4 className='text-h6 font-500'>Add attributes</h4>

          <Form name='dynamic_attributes' form={form} autoComplete='off'>
            <Form.List name='attributes'>
              {(fields, { add, remove }) => (
                <>
                  <div className='flex flex-col'>
                    {fields.map(({ key, name }) => (
                      <div key={key} className='mb-[8px] flex items-start gap-[4px]'>
                        <Form.Item name={[name, 'trait_type']} hasFeedback>
                          <TextField placeholder='Trait Type (Optional)' />
                        </Form.Item>
                        <Form.Item
                          name={[name, 'value']}
                          rules={[{ required: true, message: 'Missing value' }]}
                          hasFeedback>
                          <TextField placeholder='Value' />
                        </Form.Item>
                        <Form.Item name={[name, 'display_type']} hasFeedback>
                          <TextField placeholder='Display Type (Optional)' />
                        </Form.Item>
                        <div className='flex h-[38px] items-center px-[8px]'>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Form.Item>
                    <Button
                      appearance='secondary'
                      view='outline'
                      onClick={() => add()}
                      isRounded={false}
                      iconBefore={<PlusOutlined />}>
                      Add attribute
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form>
        </div>

        <div className='flex flex-col gap-[16px]'>
          <h4 className='text-h6 font-500'>Add a Tag</h4>

          <div className='flex'>
            <Dropdown>
              {({ isOpen, setIsOpen, innerValue, setInnerValue }: any) => {
                const onSelectOption = (value: string) => {
                  setInnerValue(value)
                  setIsOpen(false)
                  handleTagChange({ key: value })
                }

                const options = [
                  { label: 'Collectibles', value: 'Collectibles' },
                  { label: 'Charity Focused', value: 'Charity Focused' },
                  { label: 'Gaming', value: 'Gaming' },
                  { label: 'Utility', value: 'Utility' },
                ]

                return (
                  <>
                    <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                      <Button
                        appearance='secondary'
                        view='outline'
                        isRounded={false}
                        iconAfter={<i className='ri-arrow-down-s-line text-[16px]' />}>
                        {innerValue || 'Select a Tag'}
                      </Button>
                    </DropDownToggle>

                    {isOpen && (
                      <DropDownBody width={200} align='left'>
                        {(options || []).map((option: any, index: number) => {
                          const { label, value } = option

                          return (
                            <DropDownMenuItem
                              key={index}
                              onClick={() => onSelectOption(value)}
                              {...option}>
                              {label}
                            </DropDownMenuItem>
                          )
                        })}
                      </DropDownBody>
                    )}
                  </>
                )
              }}
            </Dropdown>
          </div>
        </div>

        <div className='flex items-center pt-[20px]'>
          <Button
            appearance='neutral'
            size='lg'
            isRounded={false}
            onClick={() => {
              form.validateFields().then(values => {
                const nftAttributes = values.attributes
                // value is number if possible
                for (const nftAttribute of nftAttributes || []) {
                  const newValue = Number(nftAttribute.value)
                  if (!isNaN(newValue)) {
                    nftAttribute.value = newValue
                  }
                }
                console.log('Adding NFT attributes:', nftAttributes)
                props.setAttributes({
                  ...props.attributes,
                  attributes: nftAttributes,
                })

                props.confirm()
              })
            }}>
            Continue to royalties
          </Button>
        </div>
      </div>
    </>
  )
}

const RoyaltiesSplitter = (props: {
  creators: Array<UserValue>
  royalties: Array<Royalty>
  setRoyalties: Function
  isShowErrors?: boolean
}) => {
  return (
    <>
      <div className='flex flex-col gap-[8px]'>
        {props.creators.map((creator, idx) => {
          const royalty = props.royalties.find(royalty => royalty.creatorKey === creator.key)
          if (!royalty) return null

          const amt = royalty.amount

          const handleChangeShare = (newAmt: number) => {
            props.setRoyalties(
              props.royalties.map(_royalty => {
                return {
                  ..._royalty,
                  amount: _royalty.creatorKey === royalty.creatorKey ? newAmt : _royalty.amount,
                }
              })
            )
          }

          return (
            <>
              <div
                key={idx}
                className='flex items-center gap-[20px] rounded-[4px] border border-slate-200 bg-white py-[8px] px-[12px] shadow-card'>
                <span className='w-[100px] flex-shrink-0'>{creator.label}</span>
                <TextField
                  min={0}
                  type='number'
                  max={100}
                  value={amt}
                  iconAfter={'%'}
                  onChange={event => {
                    handleChangeShare(Number(event.target.value))
                  }}
                />
                {props.isShowErrors && amt === 0 && (
                  <p className='text-sm text-R-400'>
                    The split percentage for this creator cannot be 0%.
                  </p>
                )}
              </div>
            </>
          )
        })}
      </div>
    </>
  )
}

const RoyaltiesStep = (props: {
  attributes: IMetadataExtension
  setAttributes: (attr: IMetadataExtension) => void
  confirm: () => void
}) => {
  // const file = props.attributes.image;
  const { publicKey, connected } = useWallet()
  const [creators, setCreators] = useState<Array<UserValue>>([])
  const [fixedCreators, setFixedCreators] = useState<Array<UserValue>>([])
  const [royalties, setRoyalties] = useState<Array<Royalty>>([])
  const [totalRoyaltyShares, setTotalRoyaltiesShare] = useState<number>(0)
  const [showCreatorsModal, setShowCreatorsModal] = useState<boolean>(false)
  const [isShowErrors, setIsShowErrors] = useState<boolean>(false)

  useEffect(() => {
    if (publicKey) {
      const key = publicKey.toBase58()
      setFixedCreators([
        {
          key,
          label: shortenAddress(key),
          value: key,
        },
      ])
    }
  }, [connected, setCreators])

  useEffect(() => {
    setRoyalties(
      [...fixedCreators, ...creators].map(creator => ({
        creatorKey: creator.key,
        amount: Math.trunc(100 / [...fixedCreators, ...creators].length),
      }))
    )
  }, [creators, fixedCreators])

  useEffect(() => {
    // When royalties changes, sum up all the amounts.
    const total = royalties.reduce((totalShares, royalty) => {
      return totalShares + royalty.amount
    }, 0)

    setTotalRoyaltiesShare(total)
  }, [royalties])

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[12px]'>
          <h2 className='text-h3'>Set royalties and creator splits</h2>
          <p className='text-md'>
            Royalties ensure that you continue to get compensated for your work after its initial
            sale.
          </p>
        </div>

        <div className='flex flex-col gap-[12px]'>
          <h4 className='text-h6 font-500'>Royalty Percentage</h4>
          <p className='text-md'>
            This is how much of each secondary sale will be paid out to the creators.
          </p>
          <TextField
            autoFocus
            min={0}
            max={100}
            placeholder='Between 0 and 100'
            onChange={(val) => {
              props.setAttributes({
                ...props.attributes,
                seller_fee_basis_points: val.target.value * 100,
              })
            }}
          />
        </div>

        <div className='flex flex-col gap-[12px]'>
          {[...fixedCreators, ...creators].length > 0 && (
            <div className='flex flex-col gap-[12px]'>
              <h4 className='text-h6 font-500'>Creators Split</h4>
              <p className='text-md'>
                This is how much of the proceeds from the initial sale and any royalties will be
                split out amongst the creators.
              </p>
              <RoyaltiesSplitter
                creators={[...fixedCreators, ...creators]}
                royalties={royalties}
                setRoyalties={setRoyalties}
                isShowErrors={isShowErrors}
              />
            </div>
          )}

          <div className='flex flex-col gap-[12px]'>
            <Button
              appearance='secondary'
              view='outline'
              isRounded={false}
              iconBefore={<PlusOutlined />}
              onClick={() => setShowCreatorsModal(true)}>
              Add or Remove creator(s)
            </Button>

            <MetaplexModal visible={showCreatorsModal} onCancel={() => setShowCreatorsModal(false)}>
              <label className='action-field' style={{ width: '100%' }}>
                <span className='field-title'>Creators</span>
                <UserSearch setCreators={setCreators} />
              </label>
            </MetaplexModal>
          </div>
        </div>
      </div>

      {isShowErrors && totalRoyaltyShares !== 100 && (
        <Row>
          <Text type='danger' style={{ paddingBottom: 14 }}>
            The split percentages for each creator must add up to 100%. Current total split
            percentage is {totalRoyaltyShares}%.
          </Text>
        </Row>
      )}

      <div className='flex items-center pt-[20px]'>
        <Button
          appearance='neutral'
          size='lg'
          isRounded={false}
          onClick={() => {
            // Find all royalties that are invalid (0)
            const zeroedRoyalties = royalties.filter(royalty => royalty.amount === 0)

            if (zeroedRoyalties.length !== 0 || totalRoyaltyShares !== 100) {
              // Contains a share that is 0 or total shares does not equal 100, show errors.
              setIsShowErrors(true)
              return
            }

            const creatorStructs: Creator[] = [...fixedCreators, ...creators].map(
              c =>
                new Creator({
                  address: c.value,
                  verified: c.value === publicKey?.toBase58(),
                  share:
                    royalties.find(r => r.creatorKey === c.value)?.amount ||
                    Math.round(100 / royalties.length),
                })
            )

            const share = creatorStructs.reduce((acc, el) => (acc += el.share), 0)
            if (share > 100 && creatorStructs.length) {
              creatorStructs[0].share -= share - 100
            }
            props.setAttributes({
              ...props.attributes,
              creators: creatorStructs,
            })
            props.confirm()
          }}>
          Continue to review
        </Button>
      </div>
    </>
  )
}

const LaunchStep = (props: {
  confirm: () => void
  attributes: IMetadataExtension
  files: File[]
  connection: Connection
}) => {
  const [cost, setCost] = useState(0)
  const { image } = useArtworkFiles(props.files, props.attributes)
  const files = props.files
  const metadata = props.attributes
  useEffect(() => {
    const rentCall = Promise.all([
      props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
      props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    ])
    if (files.length)
      getAssetCostToStore([...files, new File([JSON.stringify(metadata)], 'metadata.json')]).then(
        async lamports => {
          const sol = lamports / LAMPORT_MULTIPLIER

          // TODO: cache this and batch in one call
          const [mintRent, metadataRent] = await rentCall

          // const uriStr = 'x';
          // let uriBuilder = '';
          // for (let i = 0; i < MAX_URI_LENGTH; i++) {
          //   uriBuilder += uriStr;
          // }

          const additionalSol = (metadataRent + mintRent) / LAMPORT_MULTIPLIER

          // TODO: add fees based on number of transactions and signers
          setCost(sol + additionalSol)
        }
      )
  }, [files, metadata, setCost])

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[12px]'>
          <h2 className='text-h3'>Launch your creation</h2>
          <p className='text-md'>
            Provide detailed description of your creative process to engage with your audience.
          </p>
        </div>

        <div className='flex w-full flex-col justify-center gap-[16px]'>
          {props.attributes.image && (
            <ArtCard
              image={image}
              animationURL={props.attributes.animation_url}
              category={props.attributes.properties?.category}
              name={props.attributes.name}
              symbol={props.attributes.symbol}
              small={true}
              artView={props.files[1]?.type === 'unknown'}
              className='art-create-card'
            />
          )}
        </div>

        <div className='flex w-full flex-col justify-center gap-[16px]'>
          <Statistic
            className='create-statistic'
            title='Royalty Percentage'
            value={props.attributes.seller_fee_basis_points / 100}
            precision={2}
            suffix='%'
          />
          {cost ? (
            <AmountLabel
              title='Cost to Create'
              amount={cost.toFixed(5)}
              tokenInfo={useTokenList().tokenMap.get(WRAPPED_SOL_MINT.toString())}
            />
          ) : (
            <Spin />
          )}
        </div>
      </div>

      <div className='flex max-w-[700px] items-center gap-[12px]'>
        <Button className='w-full' appearance='neutral' isRounded={false} onClick={props.confirm}>
          Pay with SOL
        </Button>

        <Button className='w-full' appearance='neutral' isRounded={false} onClick={props.confirm}>
          Pay with Credit Card
        </Button>
      </div>
    </>
  )
}

const WaitingStep = (props: {
  mint: Function
  minting: boolean
  confirm: Function
  step: number
}) => {
  useEffect(() => {
    const func = async () => {
      await props.mint()
      props.confirm()
    }
    func()
  }, [])

  const setIconForStep = (currentStep: number, componentStep) => {
    if (currentStep === componentStep) {
      return <LoadingOutlined />
    }
    return null
  }

  return (
    <div
      style={{
        marginTop: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
      <Spin size='large' />
      <Card>
        <Steps direction='vertical' current={props.step}>
          <Step
            className={'white-description'}
            title='Minting'
            description='Starting Mint Process'
            icon={setIconForStep(props.step, 0)}
          />
          <Step
            className={'white-description'}
            title='Preparing Assets'
            icon={setIconForStep(props.step, 1)}
          />
          <Step
            className={'white-description'}
            title='Signing Metadata Transaction'
            description='Approve the transaction from your wallet'
            icon={setIconForStep(props.step, 2)}
          />
          <Step
            className={'white-description'}
            title='Sending Transaction to Solana'
            description='This will take a few seconds.'
            icon={setIconForStep(props.step, 3)}
          />
          <Step
            className={'white-description'}
            title='Waiting for Initial Confirmation'
            icon={setIconForStep(props.step, 4)}
          />
          <Step
            className={'white-description'}
            title='Waiting for Final Confirmation'
            icon={setIconForStep(props.step, 5)}
          />
          <Step
            className={'white-description'}
            title='Uploading to Arweave'
            icon={setIconForStep(props.step, 6)}
          />
          <Step
            className={'white-description'}
            title='Updating Metadata'
            icon={setIconForStep(props.step, 7)}
          />
          <Step
            className={'white-description'}
            title='Signing Token Transaction'
            description='Approve the final transaction from your wallet'
            icon={setIconForStep(props.step, 8)}
          />
        </Steps>
      </Card>
    </div>
  )
}

const Congrats = (props: {
  nft?: {
    metadataAccount: StringPublicKey
  }
  alert?: string
}) => {
  const history = useHistory()

  const newTweetURL = () => {
    const params = {
      text: "I've created a new NFT artwork on Metaplex, check it out!",
      url: `${window.location.origin}/#/art/${props.nft?.metadataAccount.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    }
    const queryParams = new URLSearchParams(params).toString()
    return `https://twitter.com/intent/tweet?${queryParams}`
  }

  if (props.alert) {
    // TODO  - properly reset this components state on error
    return (
      <>
        <div className='waiting-title'>Sorry, there was an error!</div>
        <p>{props.alert}</p>
        <Button onClick={() => history.push('/art/create')}>Back to Create NFT</Button>
      </>
    )
  }

  return (
    <>
      <div className='waiting-title'>Congratulations, you created an NFT!</div>
      <div className='congrats-button-container'>
        <Button className='metaplex-button' onClick={() => window.open(newTweetURL(), '_blank')}>
          <span>Share it on Twitter</span>
          <span>&gt;</span>
        </Button>
        <Button
          className='metaplex-button'
          onClick={() => history.push(`/art/${props.nft?.metadataAccount.toString()}`)}>
          <span>See it in your collection</span>
          <span>&gt;</span>
        </Button>
        <Button className='metaplex-button' onClick={() => history.push('/auction/create')}>
          <span>Sell it via auction</span>
          <span>&gt;</span>
        </Button>
      </div>
      <Confetti />
    </>
  )
}
