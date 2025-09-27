import Banner_250x300 from "@/components/features/ads/Banner_250x300";
import ModalButton from "./ModalButton";
import Banner_90x728 from "@/components/features/ads/Banner_90x728";
import Banner_320x50 from "@/components/features/ads/Banner_320x50";
import PopunderAd from "@/components/features/ads/PopunderAd";
import SocialAd from "@/components/features/ads/SocialAd";
import MonetagAd from "@/components/features/ads/Monetag";
import AdComponent from "@/components/features/ads/exo";
import MobileBannerExo from "@/components/features/ads/MobileBannerExo";
import { Fullscreen } from "lucide-react";
import MobileBannerExo42 from "@/components/features/ads/Notification";
import MobileBannerExoAlt from "@/components/features/ads/Message";
import VideoAd from "@/components/features/ads/Video";

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
