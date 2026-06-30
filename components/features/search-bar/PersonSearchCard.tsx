import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { getTMDBImageUrl } from '@/lib/mocks/config';
import { SearchCardProps } from './MediaSearchCard';

const PersonSearchCard = ({ media: person, onClick }: SearchCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`flex h-32 w-full cursor-pointer flex-row gap-4 p-4 hover:bg-foreground/10`}
    >
      {person.profile_path && person.profile_path !== '' ? (
        <div className="relative aspect-square h-full flex-shrink-0 overflow-hidden rounded-[8px]">
          <Image
            src={getTMDBImageUrl(person.profile_path, 'w200') || '/assets/images/logo_new_black.svg'}
            alt={person.name || ''}
            fill
            sizes="96px"
            className="object-cover object-center"
          />
        </div>
      ) : (
        <div className="aspect-square h-full flex-shrink-0 rounded-[8px] bg-foreground/20"></div>
      )}
      <div className="flex h-full w-full flex-col">
        <p className="truncate font-medium">{person.name}</p>
      </div>
    </div>
  );
};

export default PersonSearchCard;
