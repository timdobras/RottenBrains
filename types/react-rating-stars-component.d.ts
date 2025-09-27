declare module "react-rating-stars-component" {
	import { ComponentType } from "react";

	interface ReactStarsProps {
		count?: number;
		value?: number;
		onChange?: (newRating: number) => void;
		size?: number;
		isHalf?: boolean;
		edit?: boolean;
		emptyIcon?: JSX.Element;
		halfIcon?: JSX.Element;
		filledIcon?: JSX.Element;
		color?: string;
		activeColor?: string;
		char?: string;
		classNames?: string;
	}

	const ReactStars: ComponentType<ReactStarsProps>;

	export default ReactStars;
}
