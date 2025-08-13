import { Alert, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useNavigate } from "react-router";

// const hardcodedItems = [
// 	{ "name": "Chocolate Chip Cookiess", "qty": 23 },
// 	{ "name": "Walnut Whoppers", "qty": 102 },
// 	{ "name": "Oatmeal Raisin", "qty": 110 },
// 	{ "name": "Lemon Snaps", "qty": 3 },
// 	{ "name": "Tahini Chocolate Chip Cookies", "qty": 72 },
// 	{ "name": "Tahini Jam Cookies", "qty": 200 },
// 	{ "name": "Coconut Cream Macaroons", qty: 86 }
// ]

interface Item {
	name: string;
	qty: number;
}

type InventoryComponentProps = {
	items: Item[];
}

export const ItemBox = ({ name, qty }: Item) => {
	
	return (
		<Alert className="w-[400px] flex justify-between m-4">
			<AlertTitle>{name}</AlertTitle>
			<div>199</div>
		</Alert>
	);
};

export const InventoryComponent: React.FC<InventoryComponentProps>  = ({ items }) => {
	const navigate = useNavigate();
	return (
		<Card className="m-8" onClick={() => navigate("/business/inventory")}>
			<CardHeader className="font-semibold text-lg">Inventory</CardHeader>
			<CardContent className="flex flex-wrap items-start gap-3">
				{items && items.map((item: Item) => {
					return (
						<ItemBox key={item.name} name={item.name} qty={item.qty} />
					);
				})}
			</CardContent>
		</Card>
	)
}