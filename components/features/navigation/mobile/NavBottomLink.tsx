import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC, SVGProps } from "react";

interface NavLinkProps {
  href: string;
  icon: FC<SVGProps<SVGSVGElement>>;
  icon_fill?: FC<SVGProps<SVGSVGElement>>;
  label?: string;
}

const NavBottomLink: FC<NavLinkProps> = ({
  href,
  icon: Icon,
  icon_fill: IconFill,
  label,
}) => {
  const pathname = usePathname();
  const isActive =
    href === "/" && pathname === "/"
      ? true
      : href !== "/"
        ? pathname.includes(href.split("/").pop()!)
        : false;

  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center opacity-80`}
    >
      <div
        className={`flex w-full flex-col items-center justify-center rounded-full p-1 hover:bg-secondary/20 hover:text-accent ${
          isActive ? `bg-secondary/20 text-accent` : `text-foreground`
        }`}
      >
        {isActive && IconFill ? (
          <IconFill className="fill-current" width={24} height={24} />
        ) : (
          <Icon className="fill-current" width={24} height={24} />
        )}
      </div>
      {label && <p className="text-xs">{label}</p>}
    </Link>
  );
};

export default NavBottomLink;
