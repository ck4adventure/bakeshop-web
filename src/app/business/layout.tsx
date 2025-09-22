// Business layout for all pages a business would be accessing
// does not include login/logout
// same headerbar persists across all pages, content below

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