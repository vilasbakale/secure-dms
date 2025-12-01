import React, { useEffect, useState } from "react";
import api from "../services/api";
import ClientDetails from "./ClientDetails";
import { useAuth } from "../contexts/AuthContext";   // <-- NEW

type Client = {
  id: number;
  name: string;
  contactPerson?: string;
  createdAt?: string;
};

const ClientManagement: React.FC = () => {
  const { user } = useAuth();  // <-- NEW
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clients");
      setClients(res.data || []);
    } catch (err) {
      console.error("Failed to load clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !contactPerson.trim()) {
      setError("All fields are required");
      return;
    }

    try {
      const res = await api.post("/clients", { name, contactPerson });
      setClients(prev => [res.data, ...prev]);
      setShowModal(false);
      setName("");
      setContactPerson("");
      setError("");
    } catch (err) {
      console.error("Create client failed:", err);
      setError("Failed to create client");
    }
  };

  if (selectedClient) {
    return (
      <ClientDetails
        client={selectedClient}
        onBack={() => {
          setSelectedClient(null);
          loadClients();
        }}
      />
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>

        {/* ADMIN ONLY: Create Client */}
        {user?.role === "admin" && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Client
          </button>
        )}
      </div>

      {/* CLIENT LIST */}
      <div className="mt-6">
        {loading ? (
          <p>Loading...</p>
        ) : clients.length === 0 ? (
          <p>No clients found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 mt-4">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium">Client Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Contact Person</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Created At</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedClient(c)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <td className="px-6 py-4">{c.name}</td>
                  <td className="px-6 py-4">{c.contactPerson}</td>
                  <td className="px-6 py-4">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE CLIENT MODAL (ADMIN ONLY) */}
      {showModal && user?.role === "admin" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold">Create Client</h3>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            <div className="mt-4">
              <label className="block text-sm font-medium">Client Name</label>
              <input
                className="mt-1 p-2 w-full border rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium">Contact Person</label>
              <input
                className="mt-1 p-2 w-full border rounded"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                Cancel
              </button>
              <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientManagement;
