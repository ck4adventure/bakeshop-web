import { useParams } from "react-router";
import { useEffect, useState } from "react";

interface Item {

    "id": number;
    "name": string;
    "slug": string;
    "createdAt": string;
    "updatedAt": string;
    "inventory": {
        "itemId": number;
        "quantity": number;
        "updatedAt": string;
    }

}
// InventoryItem
// {
//     "itemId": 2,
//     "quantity": 20,
//     "updatedAt": "2025-10-16T03:12:05.429Z",
//     "item": {
//         "id": 2,
//         "name": "Brookies",
//         "slug": "brookies",
//         "createdAt": "2025-10-16T10:12:05.427Z",
//         "updatedAt": "2025-10-16T10:12:05.427Z"
//     }
// }

export default function ItemPage() {
	const { slug } = useParams<{ slug: string }>();
	const [item, setItem] = useState<Item | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!slug) return;
		// const numberId = Number(id);
		console.log("slug was : ", slug)

		const fetchItem = async () => {
			try {
				setLoading(true);
				setError(null);

				const res = await fetch(`http://localhost:3000/items/${slug}`, { credentials: 'include' });

				if (!res.ok) {
					throw new Error(`Failed to fetch item ${slug}: ${res.status}`);
				}

				const data = await res.json();
				setItem(data);
				console.log(data)
			} catch (err) {
				console.error(err);
				setError("Could not load item details.");
			} finally {
				setLoading(false);
			}
		};

		fetchItem();
	}, [slug]);

	if (loading) return <div className="p-4 text-gray-500">Loading item...</div>;
	if (error) return <div className="p-4 text-red-500">{error}</div>;
	if (!item) return <div className="p-4 text-gray-500">Item not found.</div>;

	return (
		<div id="item-page" className="p-6 border rounded-md w-fit">
			<h1 className="text-2xl font-semibold mb-2">{item.name}</h1>
			<p className="text-gray-600 mb-4">Slug: {item.slug}</p>
			{/* <p className="mb-4">{item.description || "No description available."}</p> */}

			<div className="p-4 border rounded-md w-fit">
				<span className="font-medium">Quantity:</span> {item.inventory.quantity}
			</div>
		</div>
	);
}
