import { useParams } from "react-router";

export default function ItemPage() {
	const { slug } = useParams();
	return ( 
		<div id="item-page">
			<div>Item Page for {slug}</div>
	

		</div>
	)
}