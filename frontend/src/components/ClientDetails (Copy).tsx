import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

type Client = {
  id: number;
  name: string;
};

type FileItem = {
  name: string;
  size: number;
  modified: string | null;
  folder?: string;
};

const ClientDetails: React.FC<{ client: Client; onBack: () => void }> = ({ client, onBack }) => {
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState("");
  const [globalResults, setGlobalResults] = useState<FileItem[]>([]);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  /* ---------------------------- Load Folders ---------------------------- */
  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const res = await api.get(`/files/folders/${client.id}`);
      setFolders(res.data.folders || []);

      // Auto-select first folder
      if (!selectedFolder && res.data.folders.length > 0) {
        setSelectedFolder(res.data.folders[0]);
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to load folders");
    } finally {
      setLoadingFolders(false);
    }
  }, [client.id, selectedFolder]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  /* ---------------------------- Load Files ----------------------------- */
  const loadFiles = useCallback(
    async (folderName?: string) => {
      const folder = folderName ?? selectedFolder;
      if (!folder) return;

      setLoadingFiles(true);
      try {
        const res = await api.get(`/files/list/${client.id}`, { params: { folder } });
        setFiles(res.data.files || []);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load files");
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    },
    [client.id, selectedFolder]
  );

  useEffect(() => {
    if (selectedFolder) loadFiles(selectedFolder);
  }, [selectedFolder, loadFiles]);

  /* --------------------------- Global Search --------------------------- */
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setIsGlobalSearch(false);
      setGlobalResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await api.get(`/files/search/${client.id}`, { params: { query: q } });
        if (!cancelled) {
          setGlobalResults(res.data.results || []);
          setIsGlobalSearch(true);
        }
      } catch (err) {
        console.error(err);
        setMessage("Search failed");
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, client.id]);

  const filteredFiles = useMemo(() => {
    if (!search.trim() || isGlobalSearch) return files;
    const q = search.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search, isGlobalSearch]);

  /* ----------------------------- Upload ------------------------------ */
  const handleUpload = async () => {
    if (!fileToUpload || !selectedFolder) {
      setMessage("Select folder and file first");
      return;
    }

    const form = new FormData();
    form.append("file", fileToUpload);
    form.append("folder", selectedFolder);

    try {
      await api.post(`/files/upload/${client.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Uploaded successfully");
      setFileToUpload(null);
      loadFiles(selectedFolder);
    } catch (err) {
      console.error(err);
      setMessage("Upload failed");
    }
  };

  /* --------------------------- Download File -------------------------- */
  const downloadFile = async (folder: string, file: string) => {
    try {
      const res = await api.get(`/files/download/${client.id}`, {
        params: { folder, file },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
      setMessage("Download failed");
    }
  };

  /* ------------------------------ UI ------------------------------- */

  return (
    <div className="bg-white p-6 rounded shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <button onClick={onBack} className="text-indigo-600 mb-2">← Back</button>
          <h2 className="text-2xl font-bold">{client.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ---------------------- FOLDER LIST ---------------------- */}
        <div>
          <h3 className="font-semibold mb-2">Folders</h3>
          {loadingFolders ? (
            <p>Loading...</p>
          ) : (
            <ul className="space-y-1">
              {folders.map((f) => (
                <li key={f}>
                  <button
                    onClick={() => {
                      setSelectedFolder(f);
                      setSearch("");
                      setIsGlobalSearch(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded ${
                      selectedFolder === f ? "bg-indigo-100" : "hover:bg-gray-100"
                    }`}
                  >
                    {f}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------------------- FILE AREA ---------------------- */}
        <div className="col-span-2">

          {/* Search */}
          <div className="flex justify-between mb-3">
            <input
              type="text"
              placeholder="Search across all folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded">
            {/* SEARCH RESULTS MODE */}
            {isGlobalSearch ? (
              <>
                <h4 className="font-medium mb-2">Search Results</h4>

                {globalResults.length === 0 ? (
                  <p className="text-sm text-gray-500">No results.</p>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Filename</th>
                        <th className="px-3 py-2">Folder</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">Modified</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {globalResults.map((f, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{f.name}</td>
                          <td className="px-3 py-2">{f.folder}</td>
                          <td className="px-3 py-2">{(f.size / 1024).toFixed(2)} KB</td>
                          <td className="px-3 py-2">
                            {f.modified ? new Date(f.modified).toLocaleString() : "-"}
                          </td>

                          <td className="px-3 py-2 space-x-4">
                            <button
                              className="text-indigo-600 underline"
                              onClick={() => downloadFile(f.folder!, f.name)}
                            >
                              Download
                            </button>

                            <button
                              className="text-indigo-600 underline"
                              onClick={() => {
                                setSelectedFolder(f.folder!);
                                setSearch("");
                                setIsGlobalSearch(false);
                                loadFiles(f.folder);
                              }}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <>
                {/* NORMAL FOLDER VIEW */}
                <h4 className="font-medium mb-2">Files in {selectedFolder}</h4>

                {filteredFiles.length === 0 ? (
                  <p className="text-sm text-gray-500">No files.</p>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Filename</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">Modified</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredFiles.map((f) => (
                        <tr key={f.name} className="border-t">
                          <td className="px-3 py-2">{f.name}</td>
                          <td className="px-3 py-2">{(f.size / 1024).toFixed(2)} KB</td>
                          <td className="px-3 py-2">
                            {f.modified ? new Date(f.modified).toLocaleString() : "-"}
                          </td>

                          <td className="px-3 py-2">
                            <button
                              className="text-indigo-600 underline"
                              onClick={() => downloadFile(selectedFolder, f.name)}
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>

          {/* -------------------- UPLOAD SECTION -------------------- */}
          <div className="mt-4 p-4 border rounded bg-white">
            <h4 className="font-medium mb-2">Upload File</h4>

            <div className="flex space-x-3">
              <input type="file" onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} />

              <button
                onClick={handleUpload}
                disabled={!fileToUpload || !selectedFolder}
                className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                Upload
              </button>
            </div>

            {message && <p className="mt-3 text-green-600 text-sm">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
