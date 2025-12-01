import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import UserManagement from "./UserManagement";
import ClientManagement from "./ClientManagement";
import Documents from "./Documents";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("clients");   // default for all roles

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex justify-between h-16 items-center">
          <div className="flex items-center">
            <span className="ml-3 text-xl font-bold text-gray-900">Secure DMS</span>

            {/* Navigation Tabs — NOW VISIBLE FOR ALL ROLES */}
            <div className="ml-10 flex space-x-4">

              {/* Admin Only: User Management */}
              {user?.role === "admin" && (
                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "users"
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  User Management
                </button>
              )}

              {/* All Roles: Client Management */}
              <button
                onClick={() => setActiveTab("clients")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "clients"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Client Management
              </button>

              {/* All Roles: Documents */}
              <button
                onClick={() => setActiveTab("documents")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "documents"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Documents
              </button>

            </div>
          </div>

          {/* User Profile + Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right">
              <p className="font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto mt-6 px-4">
        {/* Admin only */}
        {activeTab === "users" && user?.role === "admin" && <UserManagement />}

        {/* All roles */}
        {activeTab === "clients" && <ClientManagement />}
        {activeTab === "documents" && <Documents />}
      </div>
    </div>
  );
};

export default Dashboard;
