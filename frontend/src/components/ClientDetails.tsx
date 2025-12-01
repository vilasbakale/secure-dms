import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // Left folder list + selection
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");

  // Upload & Scan folder selectors (user can choose different upload target than currently browsed folder)
  const [uploadFolder, setUploadFolder] = useState<string>("");
  const [scanFolder, setScanFolder] = useState<string>("");

  // File listing for the selected folder (normal view)
  const [files, setFiles] = useState<FileItem[]>([]);

  // Search (global across all folders)
  const [search, setSearch] = useState("");
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [globalResults, setGlobalResults] = useState<FileItem[]>([]);

  // Upload controls
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Scan controls
  const [scanFiles, setScanFiles] = useState<File[]>([]);
  const [scanPreviews, setScanPreviews] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);

  // Messages
  const [message, setMessage] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  // Refs for debounce
  const searchTimer = useRef<number | null>(null);
  const lastSearch = useRef<string>("");

  /* ----------------------------- Helpers ----------------------------- */

  const showMessage = (type: "info" | "success" | "error", text: string) => {
    setMessage({ type, text });
    // auto clear after 4s
    setTimeout(() => setMessage(null), 4000);
  };

  /* --------------------------- Load folders -------------------------- */
  const loadFolders = useCallback(async () => {
    try {
      const res = await api.get(`/files/folders/${client.id}`);
      const list = res.data.folders || [];
      setFolders(list);

      // Initialize selections if empty
      if (!selectedFolder && list.length > 0) {
        setSelectedFolder(list[0]);
      }
      if (!uploadFolder && list.length > 0) {
        setUploadFolder(list[0]);
      }
      if (!scanFolder && list.length > 0) {
        setScanFolder(list[0]);
      }
    } catch (err) {
      console.error("Failed to load folders:", err);
      showMessage("error", "Failed to load folders");
    }
  }, [client.id, selectedFolder, uploadFolder, scanFolder]);

  useEffect(() => {
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  /* --------------------------- Load files ---------------------------- */
  const loadFiles = useCallback(
    async (folderName?: string) => {
      const folder = folderName ?? selectedFolder;
      if (!folder) {
        setFiles([]);
        return;
      }
      try {
        const res = await api.get(`/files/list/${client.id}`, { params: { folder } });
        setFiles(res.data.files || []);
      } catch (err) {
        console.error("Failed to load files:", err);
        showMessage("error", "Failed to load files for folder");
        setFiles([]);
      }
    },
    [client.id, selectedFolder]
  );

  useEffect(() => {
    // whenever selectedFolder changes, reload files
    if (selectedFolder) loadFiles(selectedFolder);
  }, [selectedFolder, loadFiles]);

  /* ---------------------------- Global search ------------------------ */
  useEffect(() => {
    const q = search.trim();
    if (q === "") {
      // clear global mode
      setIsGlobalSearch(false);
      setGlobalResults([]);
      lastSearch.current = "";
      if (searchTimer.current) {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = null;
      }
      return;
    }

    // debounce 300ms
    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
    }

    searchTimer.current = window.setTimeout(async () => {
      try {
        lastSearch.current = q;
        // call backend search endpoint
        const res = await api.get(`/files/search/${client.id}`, { params: { query: q } });
        // If user hasn't changed query since we fired the request
        if (lastSearch.current === q) {
          setGlobalResults(res.data.results || []);
          setIsGlobalSearch(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
        showMessage("error", "Search failed");
      } finally {
        if (searchTimer.current) {
          window.clearTimeout(searchTimer.current);
          searchTimer.current = null;
        }
      }
    }, 300);

    // cleanup
    return () => {
      if (searchTimer.current) {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = null;
      }
    };
  }, [search, client.id]);

  /* ----------------------------- Upload file ------------------------- */
  const handleUpload = async () => {
    if (!fileToUpload) {
      showMessage("error", "Select a file to upload");
      return;
    }
    if (!uploadFolder) {
      showMessage("error", "Select upload folder");
      return;
    }

    try {
      const form = new FormData();
      form.append("file", fileToUpload, fileToUpload.name);
      form.append("folder", uploadFolder);

      await api.post(`/files/upload/${client.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showMessage("success", "Uploaded successfully");

      // refresh file list if we're viewing the same folder
      if (uploadFolder === selectedFolder) {
        loadFiles(selectedFolder);
      }

      setFileToUpload(null);
    } catch (err) {
      console.error("Upload failed:", err);
      showMessage("error", "Upload failed");
    }
  };

  /* --------------------------- Scan -> PDF --------------------------- */
  const onSelectScans = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setScanFiles(list);

    // create previews
    // revoke old previews
    scanPreviews.forEach((u) => URL.revokeObjectURL(u));
    const urls = list.map((f) => URL.createObjectURL(f));
    setScanPreviews(urls);
  };

  const handleConvertAndUpload = async () => {
    if (!scanFolder) {
      showMessage("error", "Select folder for scanned PDF");
      return;
    }
    if (!scanFiles || scanFiles.length === 0) {
      showMessage("error", "Select one or more images");
      return;
    }

    setConverting(true);
    try {
      const form = new FormData();
      scanFiles.forEach((f) => form.append("images", f, f.name));
      form.append("folder", scanFolder);
      form.append("saveOriginals", "true");

      // Step 1: server creates PDF and saves originals, returns PDF temp name
      const res = await api.post(`/files/scan-upload/${client.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const tempPdfName: string | undefined = res.data?.pdf;
      if (!tempPdfName) {
        showMessage("error", "Server did not return generated PDF name");
        setConverting(false);
        return;
      }

      // Step 2: ask user for final name (simple prompt)
      const suggested = tempPdfName.replace(/\.pdf$/i, "");
      const userInput = window.prompt(
        "Enter desired PDF filename (without .pdf). Leave blank to keep generated name:",
        suggested
      );

      let finalName = tempPdfName;
      if (userInput && userInput.trim() !== "") {
        try {
          const ren = await api.post(`/files/rename/${client.id}`, {
            folder: scanFolder,
            oldName: tempPdfName,
            newName: userInput.trim(),
          });
          finalName = ren.data?.finalName || tempPdfName;
        } catch (err) {
          console.error("Rename failed:", err);
          showMessage("error", "Uploaded but rename failed (kept generated name)");
        }
      }

      showMessage("success", `Uploaded: ${finalName}`);

      // cleanup previews & selected files
      scanPreviews.forEach((u) => URL.revokeObjectURL(u));
      setScanPreviews([]);
      setScanFiles([]);

      // refresh file list if viewing same folder
      if (scanFolder === selectedFolder) {
        await loadFiles(selectedFolder);
      }
    } catch (err) {
      console.error("Scan upload failed:", err);
      showMessage("error", "Scan upload failed");
    } finally {
      setConverting(false);
    }
  };

  /* ---------------------------- Download File ------------------------ */
  const downloadFile = async (folder: string, fileName: string) => {
    try {
      const res = await api.get(`/files/download/${client.id}`, {
        params: { folder, file: fileName },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Download failed:", err);
      showMessage("error", "Download failed");
    }
  };

  /* -------------------------- Open folder from search ---------------- */
  const openFolderFromSearch = (folderName: string) => {
    // switch left selection and load files
    setSelectedFolder(folderName);
    // also reset search mode
    setSearch("");
    setIsGlobalSearch(false);
    setGlobalResults([]);
  };

  /* ----------------------------- Derived UI -------------------------- */
  // filteredFiles is same as files (we decided NO local search), but keep variable for clarity
  const filteredFiles = files;

  /* ----------------------------- Render UI --------------------------- */
  return (
    <div className="bg-white p-6 rounded shadow">
      {/* header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <button onClick={onBack} className="text-indigo-600 mb-2">
            ← Back
          </button>
          <h2 className="text-2xl font-bold">{client.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Browse folders, upload files, or convert scanned images to PDF</p>
        </div>
      </div>

      {/* message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === "success" ? "bg-green-50 text-green-800" : message.type === "error" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: folders */}
        <div>
          <h3 className="font-semibold mb-2">Folders</h3>

          {folders.length === 0 ? (
            <p className="text-sm text-gray-500">No folders found for this client.</p>
          ) : (
            <ul className="space-y-1">
              {folders.map((f) => (
                <li key={f}>
                  <button
                    onClick={() => setSelectedFolder(f)}
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

        {/* Right: file area */}
        <div className="col-span-2">
          {/* Search (global) */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search across all folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded">
            {/* If in global search mode, show search results */}
            {isGlobalSearch ? (
              <>
                <h4 className="font-medium mb-2">Search Results</h4>

                {globalResults.length === 0 ? (
                  <p className="text-sm text-gray-500">No results.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left">Filename</th>
                          <th className="px-3 py-2 text-left">Folder</th>
                          <th className="px-3 py-2 text-left">Size</th>
                          <th className="px-3 py-2 text-left">Modified</th>
                          <th className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {globalResults.map((g, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{g.name}</td>
                            <td className="px-3 py-2">{g.folder}</td>
                            <td className="px-3 py-2">{(g.size / 1024).toFixed(2)} KB</td>
                            <td className="px-3 py-2">{g.modified ? new Date(g.modified).toLocaleString() : "-"}</td>
                            <td className="px-3 py-2 space-x-4">
                              <button
                                className="text-indigo-600 underline"
                                onClick={() => downloadFile(g.folder!, g.name)}
                              >
                                Download
                              </button>

                              <button
                                className="text-indigo-600 underline"
                                onClick={() => openFolderFromSearch(g.folder!)}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Normal folder view */}
                <h4 className="font-medium mb-2">Files in {selectedFolder || "—"}</h4>

                {filteredFiles.length === 0 ? (
                  <p className="text-sm text-gray-500">No files.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left">Filename</th>
                          <th className="px-3 py-2 text-left">Size</th>
                          <th className="px-3 py-2 text-left">Modified</th>
                          <th className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredFiles.map((f) => (
                          <tr key={f.name} className="border-t">
                            <td className="px-3 py-2">{f.name}</td>
                            <td className="px-3 py-2">{(f.size / 1024).toFixed(2)} KB</td>
                            <td className="px-3 py-2">{f.modified ? new Date(f.modified).toLocaleString() : "-"}</td>
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
                  </div>
                )}
              </>
            )}
          </div>

          {/* Upload section (with folder dropdown) */}
          <div className="mt-4 p-4 border rounded bg-white">
            <h4 className="font-medium mb-2">Upload File</h4>
            <div className="flex gap-3 items-center">
              <select className="border p-2 rounded" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <input type="file" onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} />

              <button
                onClick={handleUpload}
                disabled={!fileToUpload}
                className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                Upload
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Select folder then choose file to upload.</p>
          </div>

          {/* Scan to PDF section (with folder dropdown) */}
          <div className="mt-4 p-4 border rounded bg-white">
            <h4 className="font-medium mb-2">Convert scanned images to PDF</h4>

            <div className="flex items-center gap-3 mb-3">
              <select className="border p-2 rounded" value={scanFolder} onChange={(e) => setScanFolder(e.target.value)}>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <input type="file" accept="image/*" multiple onChange={onSelectScans} />
            </div>

            {scanPreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {scanPreviews.map((src, i) => (
                  <div key={i} className="border rounded overflow-hidden">
                    <img src={src} alt={`scan-${i}`} className="w-full h-28 object-cover" />
                    <div className="p-1 text-xs truncate text-center">{scanFiles[i]?.name}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleConvertAndUpload}
                disabled={converting || scanFiles.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                {converting ? "Converting..." : "Convert & Upload PDF"}
              </button>

              <button
                onClick={() => {
                  // clear previews and selections
                  scanPreviews.forEach((u) => URL.revokeObjectURL(u));
                  setScanPreviews([]);
                  setScanFiles([]);
                }}
                className="px-3 py-2 border rounded"
              >
                Clear
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3">Tip: select multiple images to create a multi-page PDF (one image per page).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
