import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { UserAuth } from "../components/context/AuthContext";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import {
  SidebarProvider,
  useSidebar,
} from "../components/context/SidebarContext";

const AdminTemplateContent: React.FC<PropsWithChildren> = ({ children }) => {
  const { collapsed } = useSidebar();
  const { session, loadingPage } = UserAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(loadingPage);

  useEffect(() => {
    if (!loadingPage && !session) {
      navigate("/login");
    } else {
      setLoading(loadingPage);
    }
  }, [loadingPage, navigate, session]);

  return loading ? (
    <LoadingScreen />
  ) : (
    <div className="flex w-full h-auto">
      <div className="flex-col w-full h-auto">
        <Header />
        <section className="flex w-full min-h-screen h-auto bg-[#222222]">
          <Sidebar className="flex max-w-64 w-1/5 h-auto" />
          <div
            className={`flex ${collapsed ? "w-4/5 w-[91%]" : "w-4/5"} sm:mt-4`}
          >
            {children}
          </div>
        </section>
      </div>
    </div>
  );
};

const AdminTemplate: React.FC<PropsWithChildren> = ({ children }) => (
  <SidebarProvider>
    <AdminTemplateContent>{children}</AdminTemplateContent>
  </SidebarProvider>
);

export default AdminTemplate;
