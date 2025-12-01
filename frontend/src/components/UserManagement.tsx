import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser, getAuditLogs } from '../services/api';
import api from "../services/api";
import { User, AuditLog } from '../types';
import CreateUser from './CreateUser';

const ROLES: User["role"][] = ["admin", "manager", "user"];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeView, setActiveView] = useState<'users' | 'audit'>('users');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, logsData] = await Promise.all([
        getUsers(),
        getAuditLogs()
      ]);
      setUsers(usersData);
      setAuditLogs(logsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(id);
      setSuccess("User deleted successfully");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleRoleSave = async (id: number, role: User["role"]) => {
    try {
      await api.put(`/users/${id}/role`, { role });
      setSuccess("Role updated successfully");

      setUsers(prev =>
        prev.map(u =>
          u.id === id ? { ...u, role: role as User["role"] } : u
        )
      );

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleUserCreated = () => {
    setShowCreateModal(false);
    loadData();
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-600 mt-1">Manage users and view system activity</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveView('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveView('audit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'audit'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Audit Logs ({auditLogs.length})
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Users Table */}
      {activeView === 'users' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{user.fullName}</td>
                  <td className="px-6 py-4">{user.email}</td>

                  {/* ROLE DROPDOWN */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">

                      <select
                        className="border p-1 rounded"
                        value={user.role}
                        onChange={(e) =>
                          setUsers(prev =>
                            prev.map(u =>
                              u.id === user.id
                                ? { ...u, role: e.target.value as User["role"] }
                                : u
                            )
                          )
                        }
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRoleSave(user.id, user.role)}
                        className="bg-indigo-600 text-white text-xs px-2 py-1 rounded"
                      >
                        Save
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4">{formatDate(user.created_at)}</td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

      {/* Audit Logs */}
      {activeView === 'audit' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">IP</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{formatDateTime(log.created_at)}</td>
                    <td className="px-6 py-4">{log.full_name || log.email}</td>
                    <td className="px-6 py-4">{log.action}</td>
                    <td className="px-6 py-4">{log.entity_type}</td>
                    <td className="px-6 py-4">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateUser
          onClose={() => setShowCreateModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </div>
  );
};

export default UserManagement;
