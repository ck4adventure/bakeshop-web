import { ItemBox } from "@/components/Inventory/InventoryComponent";
import { useEffect, useState } from "react";

export default function InventoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:3000/items");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); 

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="m-4">Current Inventory Levels</div>
      <ul>
        {data.map(item => (
					<ItemBox name={item.name} qty={199} key={item.name} />
        ))}
      </ul>
    </div>
  );
}
