import React, { useEffect, useState } from "react";
import { Link } from "react-router";

// Define the shape of an item returned by your API
interface InventoryItem {
	"itemId": number,
	"quantity": number,
	"updatedAt": string,
	"item": {
		"name": string,
		"slug": string
	}
};
// Optional: define an API response type if it's not a plain array
// type ApiResponse = Item[];

const InventoryList: React.FC = () => {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchInventory = async () => {
			try {
				const response = await fetch("http://localhost:3000/inventory", { credentials: 'include' });
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data: InventoryItem[] = await response.json();
				setItems(data);
			} catch (err) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("Unknown error");
				}
			} finally {
				setLoading(false);
			}
		};

		fetchInventory();
	}, []);

	if (loading) return <p>Loading items...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div>
			{items.length === 0 ? (
				<p>No items found.</p>
			) : (
				<ul className="flex flex-col items-center">
					{items.map((item) => (
						<Link key={item.itemId} to={`/business/items/${item.item.slug}`} >
						<div  className="w-[400px] m-4 flex flex-col border rounded-md">
							<div className="flex justify-between p-4">
								<div>{item.item.name}</div>
								<div>{item.quantity}</div>
							</div>
							{/* Bottom color band */}
							<div className={`h-2 rounded-b-md ${item.quantity > 30 ? 'bg-green-500' : item.quantity > 10 ? 'bg-orange-400' : 'bg-red-500'}`} />
						</div>
						</Link>
					))}
				</ul>
			)}
		</div>
	);
};

export default InventoryList;
