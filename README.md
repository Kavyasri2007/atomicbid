 #Atomicbid — Premium Online Auction System

Atomicbid is a high-end, full-stack online auction platform designed with a focus on security, real-time engagement, and automated financial settlement. It features a modern, Dribbble-inspired UI with a glassmorphism design system and robust backend logic to handle complex auction scenarios.

##  Tech Stack

### Frontend
- **React 18** (Vite-powered)
- **Framer Motion** for premium micro-animations and transitions
- **Socket.io-client** for real-time bid synchronization
- **Vanilla CSS** with a custom Glassmorphism Design System
- **Stripe & Razorpay SDKs** for secure payment verification

### Backend
- **Python Flask** (RESTful API)
- **Flask-SocketIO** for bi-directional real-time communication
- **PyMySQL** for database connectivity
- **JWT (PyJWT)** for secure, stateless authentication
- **Python-Dotenv** for secure environment variable management

### Database
- **MySQL** with strict concurrency control (FOR UPDATE locks)

---

##  Key Features

### 1. Real-Time Bidding Engine
- **Instant Updates:** Bids are broadcasted to all connected clients instantly via WebSockets.
- **Dynamic Countdown:** Precise auction timers that sync across all devices.

### 2. Smart Auction Logic
- **Proxy Bidding:** Users can set a "Maximum Bid." The system automatically outbids competitors by the minimum increment until the maximum is reached.
- **Anti-Sniping Mechanism:** If a bid is placed in the final 2 minutes, the auction is automatically extended by 2 minutes to ensure fair play.

### 3. Secure Payment Ecosystem
- **Pre-Verification:** Mandatory card/UPI verification (Stripe SetupIntents or Razorpay Orders) before a user can place their first bid.
- **Automated Settlement:** The system automatically attempts to charge the winning bidder's saved payment method immediately upon auction closure.
- **Webhook Integration:** Real-time updates on payment success or failure.

### 4. Governance & Trust
- **Admin Dashboard:** Full control over user moderation (banning/unbanning) and auction management.
- **Rating & Reviews:** A post-auction feedback system where winners can rate and review sellers.

---

##  Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js 18+
- MySQL Server

### 1. Database Configuration
1. Create a MySQL database named `atomicbid_db`.
2. Import the schema:
   ```bash
   mysql -u your_user -p atomicbid_db < schema.sql
   ```
3. (Optional) Seed the database with test data:
   ```bash
   mysql -u your_user -p atomicbid_db < seed.sql
   ```

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Copy `.env.example` to `.env`.
   - Update the values with your database credentials and API keys.
5. Run the server:
   ```bash
   python run_server.py
   ```

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## Security Note
This project is configured to be "Git-Ready." Sensitive information like API keys and database passwords should **never** be committed to the repository. Always use the `.env` file for local configuration.

