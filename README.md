📁 Secure DMS – Document Management System

A Role-Based, Secure, Audit-Logged Document Management Platform

🚀 Overview

Secure DMS is a Node.js + Express + PostgreSQL + React based Document Management System designed for law firms, enterprises, and consultants who handle confidential client documents.

The platform provides:

Secure client-wise document storage

Role-based access (Admin / Manager / User)

Multi-folder structure per client

Document upload, download, and global search

File versioning (auto _v2, _v3…)

Scan → PDF conversion

Audit logging

User & role management

🏗️ Tech Stack
Frontend

React (Vite)

Axios

TailwindCSS

Backend

Node.js + Express

PostgreSQL

JWT Authentication

Multer (memory storage)

Sharp & PDFKit

Audit logging

Storage

Server filesystem under /storage/Clients/<CLIENT_CODE>/

🔐 User Roles
Role	Permissions
Admin	Manage users, create clients, upload, scan PDF, rename files, read everything
Manager	Create clients, upload, scan PDF, rename, read everything
User	Upload, scan PDF, rename, view clients, download files, search

✔ All roles can access client folders & files
✔ Only admin can create & delete users

📁 Folder Structure

Each client has auto-created subfolders:

/storage/Clients/<CLIENT_CODE>/
    Case Documents/
    Pleadings/
    Evidence/
    Court Filings/
    Correspondence/

⚙️ Installation Guide
1️⃣ Clone Repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

🛠️ Backend Setup (Node + Express)
2️⃣ Install dependencies
cd secure_dms_backend
npm install

3️⃣ Create .env
PORT=5000
JWT_SECRET=your_secret_key
DATABASE_URL=postgres://user:password@host:5432/dbname
STORAGE_ROOT=/storage

4️⃣ Run migrations (example)
psql -d yourdbname -f migrations/001_users.sql
psql -d yourdbname -f migrations/002_clients.sql

5️⃣ Start backend
npm run dev


Backend runs at:

http://localhost:5000/api

🖥️ Frontend Setup (React + Vite)
Install dependencies
cd secure_dms_frontend
npm install

Create .env
VITE_API_URL=http://localhost:5000/api

Start frontend
npm run dev


Frontend runs at:

http://localhost:3000

🔑 Authentication

The system uses JWT with Authorization: Bearer <token> headers.
Token is returned on login and stored in localStorage.

📘 Key API Endpoints
Auth
POST /auth/login

Users (Admin only)
GET /users
POST /users
DELETE /users/:id
PUT /users/:id/role
GET /users/audit-logs

Clients
GET /clients
POST /clients (admin + manager)

Files
GET /files/folders/:clientId
GET /files/list/:clientId?folder=
GET /files/search/:clientId?query=
GET /files/download/:clientId?folder=&file=
POST /files/upload/:clientId
POST /files/scan-upload/:clientId
POST /files/rename/:clientId

📸 Features
✔ Client Management

Create, list, and select clients.

✔ Folder Browsing

Auto-generated folders per client.

✔ File Upload

Memory-based upload → version-controlled file saved.

✔ Scan to PDF

Upload multiple images → backend creates a PDF.

✔ Global Search

Search across all folders for matching filenames.

✔ Versioning

Automatically saves updated file as _v2, _v3, etc.

✔ Audit Logging

Tracks actions such as create user, login, uploads, deletes.

🧪 Pre-Release Testing Instructions

To upload this repository as a pre-release on GitHub:

📤 Upload to GitHub
1️⃣ Initialize Git repo

(Inside your project root)

git init
git add .
git commit -m "Initial pre-release version"

2️⃣ Create GitHub repo

Go to:

👉 https://github.com/new

Create a repo named:

secure-dms

3️⃣ Connect local → GitHub
git remote add origin https://github.com/<your-username>/secure-dms.git
git branch -M main
git push -u origin main

🏷️ Create a Pre-Release Tag
1️⃣ Add version tag
git tag -a v1.0.0-beta -m "Pre-release beta version"
git push origin v1.0.0-beta

2️⃣ Mark as pre-release on GitHub

Go to Releases tab

Click Draft a new release

Choose tag: v1.0.0-beta

Check: "This is a pre-release"

Publish

🎉 Your pre-release is now live on GitHub!

📞 Support / Contact

For support, issues, or enhancements:
Create an Issue on GitHub or contact the maintainer.

⭐ Contribution Guidelines

Pull requests and contributions are welcome!
Follow standard Git branching:

feature/<name>
fix/<name>
release/<version>

🔒 Security Notes

All folders safely created using Node fs

Uploads use in-memory storage to avoid disk overwrite issues

All file operations validated with fs.existsSync

EXDEV-safe renaming (automatic copy+delete fallback)

🎉 Final Notes

This Secure DMS system is ready for production with minor deployment adjustments.
You can run it in Docker, PM2, or any cloud host easily.