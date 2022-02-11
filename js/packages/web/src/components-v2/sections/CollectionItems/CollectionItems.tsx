import React, { FC, useState } from 'react';
import CN from 'classnames';
import { Chip } from '../../atoms/Chip';
import { TextField } from '../../atoms/TextField';
import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
} from '../../atoms/Dropdown';
import { ArtCard } from '../../molecules/ArtCard';
import { Modal } from '../../molecules/Modal';
import { ArtDetails } from '../../molecules/ArtDetails';
import { QuickBuy } from '../../sections/QuickBuy';

import { arts } from '../../../../dummy-data/arts';

export interface CollectionItemsProps {
  [x: string]: any;
}

export const CollectionItems: FC<CollectionItemsProps> = ({
  className,
  ...restProps
}: CollectionItemsProps) => {
  const CollectionItemsClasses = CN(`collection-items w-full`, className);
  const [showQuickBuyModal, setShowQuickBuyModal] = useState<boolean>(false);
  const [showArtModalModal, setShowArtModalModal] = useState<boolean>(false);
  const [selectedArt, setSelectedArt] = useState<any>(null);

  return (
    <div className={CollectionItemsClasses} {...restProps}>
      <div className="flex py-[32px] gap-[8px] flex-wrap">
        <Chip onClose={() => {}}>Buy Now</Chip>
        <Chip onClose={() => {}} label="Character">
          Foxy belugie
        </Chip>
        <Chip onClose={() => {}} label="Price range">
          ◎ .05 - ◎ .10
        </Chip>
        <Chip onClose={() => {}} label="Face">
          Happy
        </Chip>
        <Chip onClose={() => {}} label="Shirt">
          Beach
        </Chip>
        <Chip onClose={() => {}} label="Tier">
          Professional
        </Chip>

        <button className="appearance-none text-md text-B-400 font-500 h-[32px] px-[8px] rounded-full">
          Clear all
        </button>
      </div>

      <div className="flex gap-[20px]">
        <TextField
          iconBefore={<i className="ri-search-2-line" />}
          placeholder="Search for traits, tags, item #s, and more..."
          size="sm"
        />

        <Dropdown className="w-[260px]">
          {({ isOpen, setIsOpen, setInnerValue, innerValue }: any) => {
            const onSelectOption = (value: string) => {
              setIsOpen(false);
              setInnerValue(value);
            };

            const options = [
              { label: 'Art: A to Z', value: 'Art: A to Z' },
              { label: 'Art: Z to A', value: 'Art: Z to A' },
              {
                label: 'Price: Low to High',
                value: 'Price: Low to High',
              },
              {
                label: 'Price: High to Low',
                value: 'Price: High to Low',
              },
            ];

            return (
              <>
                <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                  <TextField
                    iconAfter={
                      isOpen ? (
                        <i className="ri-arrow-up-s-line" />
                      ) : (
                        <i className="ri-arrow-down-s-line" />
                      )
                    }
                    value={innerValue || 'Price: Low to High'}
                    readOnly
                    size="sm"
                  />
                </DropDownToggle>

                {isOpen && (
                  <DropDownBody
                    align="right"
                    className="w-full shadow-lg shadow-B-700/10 border border-B-10 mt-[8px]"
                  >
                    {options?.map((option: any, index: number) => {
                      const { label, value } = option;

                      return (
                        <DropDownMenuItem
                          key={index}
                          onClick={() => onSelectOption(value)}
                          {...option}
                        >
                          {label}
                        </DropDownMenuItem>
                      );
                    })}
                  </DropDownBody>
                )}
              </>
            );
          }}
        </Dropdown>
      </div>

      <div className="grid grid-cols-4 gap-[28px] pt-[32px]">
        {arts.map((art: any, index: number) => {
          return (
            <ArtCard
              onClickBuy={() => {
                setSelectedArt(art);
                setShowQuickBuyModal(true);
              }}
              onClickDetails={() => {
                setSelectedArt(art);
                setShowArtModalModal(true);
              }}
              key={index}
              {...art}
            />
          );
        })}
      </div>

      {showQuickBuyModal && (
        <Modal
          heading="Complete order"
          onClose={() => setShowQuickBuyModal(false)}
        >
          {({ modalClose }: any) => {
            return (
              <>
                <QuickBuy
                  onSubmit={(e: any) => {
                    modalClose(e);
                    setShowQuickBuyModal(false);
                  }}
                  art={selectedArt}
                />
              </>
            );
          }}
        </Modal>
      )}

      {showArtModalModal && (
        <Modal
          onClose={() => setShowArtModalModal(false)}
          size="lg"
          isFixed={false}
        >
          {({ modalClose }: any) => {
            return (
              <>
                <ArtDetails
                  onSubmit={(e: any) => {
                    modalClose(e);
                    setShowArtModalModal(false);
                  }}
                  art={selectedArt}
                />
              </>
            );
          }}
        </Modal>
      )}
    </div>
  );
};

export default CollectionItems;
