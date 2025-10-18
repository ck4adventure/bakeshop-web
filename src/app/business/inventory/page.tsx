import InventoryList from "@/components/InventoryList/InventoryList";
import { Outlet } from "react-router";

export default function InventoryPage() {
	return (
		<div id="inventory-page">
			<div>Inventory Page</div>
			<InventoryList />
			<Outlet />
		</div>
	)
}