import { Star } from 'lucide-react';
import Link from 'next/link';
import JellyfinButton from '../JellyfinButton';
import ShareButton from '../ShareButton';
import TheaterToggle from '../TheaterToggle';

interface ActionButtonsProps {
  media_type: string;
  media_id: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ media_type, media_id }) => {
  return (
    <div className="flex flex-shrink-0 flex-row gap-2 overflow-x-auto pb-2 text-sm">
      <JellyfinButton />
      <Link
        href={`/protected/create-post/${media_type}/${media_id}`}
        className="z-10 flex flex-row items-center gap-2 justify-self-end rounded-full bg-foreground/10 px-4 py-1"
      >
        <Star size={12} />
        <p>Rate</p>
      </Link>
      <ShareButton />
      <TheaterToggle />
    </div>
  );
};

export default ActionButtons;
