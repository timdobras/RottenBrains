import { Tab } from "./Tab";

const NewTabs = () => {
  const tabs = [
    { name: "Home", link: "/protected/profile" },
    { name: "Movies", link: "/protected/profile/movies" },
    { name: "Shows", link: "/protected/profile/tv" },
    { name: "History", link: "/protected/profile/history" },
  ];

  return (
    <div className="flex w-full flex-row">
      {tabs.map((tab) => (
        <Tab key={tab.link} name={tab.name} link={tab.link} />
      ))}
      <div className="h-12 w-full border-b border-foreground/10 px-4 py-2"></div>
    </div>
  );
};

export default NewTabs;
