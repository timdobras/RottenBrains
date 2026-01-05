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
        <img
          src={getTMDBImageUrl(person.profile_path, 'w200') || ''}
          alt=""
          className="aspect-square h-full flex-shrink-0 overflow-hidden rounded-[8px] object-cover object-center"
        />
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
