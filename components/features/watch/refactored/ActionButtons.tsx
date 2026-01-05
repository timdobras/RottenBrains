import Link from 'next/link';
import ProviderDropdown from '../ProviderDropdown';
import ShareButton from '../ShareButton';

interface ActionButtonsProps {
  media_type: string;
  media_id: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ media_type, media_id }) => {
  return (
    <div className="flex flex-shrink-0 flex-row gap-2 overflow-x-auto pb-2 text-sm">
      <ProviderDropdown />
      <Link
        href={`/protected/create-post/${media_type}/${media_id}`}
        className="z-10 flex flex-row items-center gap-2 justify-self-end rounded-full bg-foreground/10 px-4 py-1"
      >
        <img
          src="/assets/icons/star-outline.svg"
          alt="Rate"
          width={12}
          height={12}
          className="invert-on-dark"
          loading="lazy"
        />
        <p>Rate</p>
      </Link>
      <ShareButton />
    </div>
  );
};

export default ActionButtons;
