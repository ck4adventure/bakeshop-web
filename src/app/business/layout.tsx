import HeaderBar from "@/components/HeaderBar/HeaderBar";
import { Outlet } from "react-router";

export default function BusinessLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* You can add a sidebar, header, etc. here */}
			<HeaderBar />
      <Outlet />
    </div>
  );
}