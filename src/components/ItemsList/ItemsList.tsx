import React, { useEffect, useState } from "react";

// Define the shape of an item returned by your API
interface Item {
  id: number | string;
  name: string;
  // // Add any other fields your API returns
  // description?: string;
}

// Optional: define an API response type if it's not a plain array
// type ApiResponse = Item[];

const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch("http://localhost:3000/items");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Item[] = await response.json();
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

    fetchItems();
  }, []);

  if (loading) return <p>Loading items...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Items</h2>
      {items.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              {/* {item.description && <p>{item.description}</p>} */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ItemList;
