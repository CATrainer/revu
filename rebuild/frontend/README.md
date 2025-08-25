Run frontend locally:

1) Set NEXT_PUBLIC_API_URL to backend, e.g. http://localhost:8000
2) npm install
3) npm run dev

Production-lite polish included:
- Global Toasts for success/error feedback
- Route-level loading and error components
- Security headers set in next.config.js (nosniff, frame deny, referrer policy)
