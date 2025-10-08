# ByteBites Yorùbá Kitchen ChatBot

A smart, chat-style restaurant ordering system for local Nigerian/Yorùbá dishes — integrated with **Paystack payments** and an automatic **10% discount** on all orders above **₦70,000**.



# Features
 Interactive chat-based ordering (no login required)
Menu of classic Yorùbá dishes (amala, eba, ikokore, moin-moin, etc.)
 Secure Paystack payment 
Order history, active order view, and cancel options
 10% automatic discount on big orders above  (₦70,000+)
 i can change food image as well



#Tech Stack
- Node.js (Express)
- HTML & CSS
- JSON for data storage


##Setup 
```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/yoruba-kitchen-chatbot.git
cd yoruba-kitchen-chatbot

# 2. Install dependencies
npm install

# 3. Copy environment example file
cp .env.example .env

# 4. Add your Paystack keys and base URL to .env:
# PAYSTACK_SECRET_KEY=sk_test_...
# PAYSTACK_PUBLIC_KEY=pk_test_...
# BASE_URL=http://localhost:8080

# 5. Run the server
npm run dev
