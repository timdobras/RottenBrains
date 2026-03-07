import { Fullscreen } from 'lucide-react';
import Banner_250x300 from '@/components/features/ads/Banner_250x300';
import Banner_320x50 from '@/components/features/ads/Banner_320x50';
import Banner_90x728 from '@/components/features/ads/Banner_90x728';
import AdComponent from '@/components/features/ads/exo';
import MobileBannerExoAlt from '@/components/features/ads/Message';
import MobileBannerExo from '@/components/features/ads/MobileBannerExo';
import MonetagAd from '@/components/features/ads/Monetag';
import MobileBannerExo42 from '@/components/features/ads/Notification';
import PopunderAd from '@/components/features/ads/PopunderAd';
import SocialAd from '@/components/features/ads/SocialAd';
import VideoAd from '@/components/features/ads/Video';
import ModalButton from './ModalButton';

export default function Home() {
  return (
    <div className="h-[200vh] w-full bg-foreground/5">
      {/* <Banner_320x50></Banner_320x50> */}
      {/* <Banner_90x728></Banner_90x728>
      <Banner_250x300></Banner_250x300>
      <Banner_320x50></Banner_320x50>
      <SocialAd></SocialAd> */}
      <MobileBannerExo></MobileBannerExo>
      <MobileBannerExo42></MobileBannerExo42>
      <MobileBannerExoAlt></MobileBannerExoAlt>
      <VideoAd></VideoAd>
      {/* <Fullscreen></Fullscreen> */}
      {/* <MonetagAd></MonetagAd> */}
      {/* <PopunderAd></PopunderAd> */}
    </div>
  );
}
