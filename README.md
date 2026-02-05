 **Modern Platform for Tenant Credit Scoring & Risk Assessment**

This project is a comprehensive **Tenant Rating System** developed as a final project. It utilizes advanced technologies to assess tenant reliability based on financial data, rental history, and official documents, providing landlords with a clear "Rentability Score".

🔗 **GitHub Repository:** [https://github.com/Sgross1/tanentProjv2](https://github.com/Sgross1/tanentProjv2)

---

## 🚀 Key Features

*   **📊 Smart Scoring Algorithm:** Analyzes payslips, income-to-rent ratio, tenure stability, and pension data to generate a user rating (0-100).
*   **🤖 AI-Powered OCR:** Integration with **Azure Document Intelligence** to automatically extract data from uploaded payslips (PDF/Image).
*   **🔒 Secure & Verified:** Strict validation of user identity vs. document data to prevent fraud.
*   **⚡ Real-Time Updates:** Uses **SignalR** for live notifications (e.g., "Score Calculation Complete") without page refreshes.
*   **📱 Responsive Dashboard:** A modern, mobile-friendly interface built with **Angular 16** & **Material Design**.
*   **👮 Admin Panel:** Powerful tools for user management, system logs, and blocking users.

---

## 🛠 Technology Stack

### Client Side (Frontend)
*   **Framework:** Angular 16
*   **Language:** TypeScript
*   **Styling:** SCSS, Angular Material, Bootstrap
*   **Visualization:** Ngx-Charts, Three.js (3D Elements)

### Server Side (Backend)
*   **Framework:** .NET 8.0 Web API
*   **Language:** C#
*   **Database:** SQL Server (Production) / SQLite (Development)
*   **ORM:** Entity Framework Core (Code-First)
*   **Security:** JWT Authentication, BCrypt Hashing

### Cloud & Infrastructure
*   **AI/ML:** Azure Document Intelligence (OCR)
*   **Email:** Resend API (Transactional Emails)

---

## 🏗 Architecture

The system follows a **Layered Architecture (N-Tier)**:
1.  **Presentation Layer:** Angular Client (SPA).
2.  **API Layer:** .NET Controllers (RESTful).
3.  **Business Logic Layer:** Services for Scoring, OCR, and Auth.
4.  **Data Access Layer:** EF Core Repositories.

---

## 🏁 Getting Started

### Prerequisites
*   Node.js (v18+)
*   .NET 8.0 SDK
*   SQL Server / SQLite

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Sgross1/tanentProjv2.git
    cd tanentProjv2
    ```

2.  **Backend Setup:**
    ```bash
    cd TenantRating.API
    dotnet restore
    dotnet run
    ```

3.  **Frontend Setup:**
    ```bash
    cd TenantRating.Client
    npm install
    ng serve
    ```

4.  **Navigate directly** to `http://localhost:4200`

---

## 👨‍💻 Author

Developed by **Shlomם Gross** and **Azriel Roitman** as a Final Project (Mahat).
For inquiries: [GitHub Profile](https://github.com/Sgross1)
