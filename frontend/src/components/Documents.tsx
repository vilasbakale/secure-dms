import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const Documents: React.FC = () => {
  const { user } = useAuth();

  // Guides available for each role
  const allGuides = [
    { key: "admin", title: "Admin Guide" },
    { key: "manager", title: "Manager Guide" },
    { key: "user", title: "User Guide" },
    { key: "implementation", title: "Implementation Guide" },
    { key: "backup", title: "Backup Guide" },
    { key: "release", title: "Release Notes" },
  ];

  const userOnly = [{ key: "user", title: "User Guide" }];

  // Which guides to show
  const guidesToShow = user?.role === "user" ? userOnly : allGuides;

  const [activeGuide, setActiveGuide] = useState(guidesToShow[0].key);

  /** STATIC GUIDE CONTENT */
  const guideContent: Record<string, JSX.Element> = {
    admin: (
      <div>
        <h2 className="text-2xl font-bold mb-4">Admin Guide</h2>
        <p className="mb-4">
          The Admin Guide provides instructions for managing system users, roles, clients,
          folders, and core configuration options.
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Create, edit, and delete users</li>
          <li>Assign and change user roles</li>
          <li>View audit logs</li>
          <li>Manage client accounts and document access</li>
          <li>Perform administrative system tasks</li>
        </ul>
      </div>
    ),

    manager: (
      <div>
        <h2 className="text-2xl font-bold mb-4">Manager Guide</h2>
        <p className="mb-4">
          The Manager Guide explains how managers can oversee client folders, upload and
          manage documents, and monitor activity.
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Manage client folders</li>
          <li>Upload documents and scanned PDFs</li>
          <li>Search documents globally</li>
          <li>Coordinate document versioning</li>
        </ul>
      </div>
    ),

    user: (
      <div>
        <h2 className="text-2xl font-bold mb-4">User Guide</h2>
        <p className="mb-4">
          The User Guide helps standard users perform basic actions in the system.
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Browse client documents</li>
          <li>Search files inside the client workspace</li>
          <li>Download available documents</li>
          <li>Upload new files (if permitted)</li>
        </ul>
      </div>
    ),

    implementation: (
      <div>
        <h2 className="text-2xl font-bold mb-4">Implementation Guide</h2>
        <p className="mb-4">
          This section includes installation, configuration, and environment setup instructions
          for the Secure DMS system.
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>System prerequisites</li>
          <li>Backend setup</li>
          <li>Frontend setup</li>
          <li>Environment configuration</li>
          <li>Deployment process</li>
        </ul>
      </div>
    ),

    backup: (
      <div>
        <h2 className="text-2xl font-bold mb-4">Backup Guide</h2>
        <p className="mb-4">
          Details on backing up client documents, database, metadata, and versioning information.
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Storage folder backup steps</li>
          <li>Database backup procedures</li>
          <li>Restoration guide</li>
          <li>Safety checks before restore</li>
        </ul>
      </div>
    ),

    release: (
      <div>
        <h2 className="text-2xl font-bold mb-4">Release Notes</h2>
        <p className="mb-4">All version updates, bug fixes, and new features.</p>

        <ul className="list-disc ml-6 space-y-2">
          <li>v1.0 — Initial secure DMS release</li>
          <li>v1.1 — Added search across folders</li>
          <li>v1.2 — Added role-based access control</li>
          <li>v1.3 — Added Scan → PDF module</li>
        </ul>
      </div>
    ),
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 flex">

      {/* LEFT MENU */}
      <div className="w-64 border-r pr-4">
        <h3 className="text-lg font-semibold mb-4">Documentation</h3>

        <ul className="space-y-1">
          {guidesToShow.map((g) => (
            <li key={g.key}>
              <button
                onClick={() => setActiveGuide(g.key)}
                className={`w-full text-left px-3 py-2 rounded ${
                  activeGuide === g.key
                    ? "bg-indigo-100 text-indigo-700 font-semibold"
                    : "hover:bg-gray-100"
                }`}
              >
                {g.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 pl-6">
        {guideContent[activeGuide]}
      </div>

    </div>
  );
};

export default Documents;
