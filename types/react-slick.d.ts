declare module "react-slick" {
	import * as React from "react";

	export interface Settings {
		dots?: boolean;
		infinite?: boolean;
		speed?: number;
		slidesToShow?: number;
		slidesToScroll?: number;
		autoplay?: boolean;
		autoplaySpeed?: number;
		[key: string]: any;
	}

	export default class Slider extends React.Component<Settings> {}
}
