import { fetchUserDataServer } from "@/lib/server/fetchUserData";

export const sidebarLinks = [
  {
    image_url: "/assets/icons/home-outline.svg",
    image_url_active: "/assets/icons/home.svg",
    route: "/",
    label: "Home",
  },
  {
    image_url: "/assets/icons/compass-outline.svg",
    image_url_active: "/assets/icons/compass.svg",
    route: "/protected/explore",
    label: "Explore",
  },
  {
    image_url: "/assets/icons/add-circle-outline.svg",
    image_url_active: "/assets/icons/add-circle.svg",
    route: "/protected/create-post",
    label: "Add Post",
  },
];
