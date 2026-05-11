 **Modern Platform for Tenant Credit Scoring & Risk Assessment**

This project is a comprehensive **Tenant Rating System** developed as a final project. It utilizes advanced technologies to assess tenant reliability based on financial data, rental history, and official documents, providing landlords with a clear "Rentability Score".

🔗 **GitHub Repository:** [https://github.com/Sgross1/tanentProjv2](https://github.com/Sgross1/tanentProjv2)

---

## 🚀 Key Features

*   **📊 Smart Scoring Algorithm:** Analyzes payslips, income-to-rent ratio, tenure stability, and pension data to generate a user rating (0-100).
*   **🤖 AI-Powered OCR:** Integration with **Azure Document Intelligence** to automatically extract data from uploaded payslips (PDF/Image).
*   **🔒 Secure & Verified:** Strict validation of user identity vs. document data to prevent fraud.
*   **⚡ Status Feedback:** The client receives API responses for score calculation, validation, and email/SMS outcomes.
*   **📱 Responsive Dashboard:** A modern, mobile-friendly interface built with **Angular 19**.
*   **👮 Admin Panel:** Powerful tools for user management, system logs, and blocking users.

---

## 🛠 Technology Stack

### Client Side (Frontend)
*   **Framework:** Angular 19
*   **Language:** TypeScript
*   **Styling:** SCSS, Angular Material, Bootstrap
*   **Visualization:** Three.js (3D Elements)

### Server Side (Backend)
*   **Framework:** .NET 9.0 Web API
*   **Language:** C#
*   **Database:** SQLite
*   **ORM:** Entity Framework Core (Code-First)
*   **Security:** JWT Authentication, HMACSHA512 password hashing

### Cloud & Infrastructure
*   **AI/ML:** Azure Document Intelligence (OCR)
*   **Email:** Resend API (Transactional Emails via HttpClient)
*   **SMS:** SMS4Free integration via HttpClient

---

## 🏗 Architecture

The system follows a **Layered Architecture (N-Tier)**:
1.  **Presentation Layer:** Angular Client (SPA).
2.  **API Layer:** .NET Controllers (RESTful).
3.  **Business Logic Layer:** Services for Scoring, OCR, and Auth.
4.  **Data Access Layer:** EF Core DbContext and entities.

---

## 🏁 Getting Started

### Prerequisites
*   Node.js (LTS recommended)
*   .NET 9.0 SDK
*   SQLite database file

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

### Notes
*   Password reset and email sending are configured through `TenantRating.API/appsettings.json`.
*   SMS sending uses the `SmsSettings` section in the same file.

---

## 👨‍💻 Author

Developed by **Shlomo Gross** and **Azriel Roitman** as a Final Project (Mahat).
For inquiries: [GitHub Profile](https://github.com/Sgross1)
