import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC, SVGProps } from "react";

interface NavLinkProps {
  href: string;
  icon: FC<SVGProps<SVGSVGElement>>;
  icon_fill?: FC<SVGProps<SVGSVGElement>>;
  label?: string;
}

const NavLink: FC<NavLinkProps> = ({
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
      className={`rounded-full p-2 px-4 hover:bg-foreground/10 ${
        isActive ? `text-accent` : `text-foreground`
      }`}
    >
      <div
        className={`flex flex-row items-center gap-4 ${!label ? "justify-center" : ""}`}
      >
        {isActive && IconFill ? (
          <IconFill
            className="flex-shrink-0 fill-current"
            width={24}
            height={24}
          />
        ) : (
          <Icon className="flex-shrink-0 fill-current" width={24} height={24} />
        )}
        {label && (
          <p
            className={`w-max truncate pr-4 text-sm ${
              isActive ? `text-accent` : `text-foreground`
            }`}
          >
            {label}
          </p>
        )}
      </div>
    </Link>
  );
};

export default NavLink;
