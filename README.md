# Campus Skill Swap

Students trade skills instead of money ("I'll teach you guitar, you teach me Python").

## Run it
1. Open this folder in VS Code
2. In the terminal (Ctrl + `) run:
       npm install
       npm start
3. Open http://localhost:5000

Demo logins (password demo123): asha@demo.com, rohan@demo.com, meera@demo.com, kiran@demo.com

## Project structure
    server/
      index.js          starts Express + Socket.io and plugs in the routes
      db.js             SQLite tables and demo data
      helpers.js        login token, auth check, text cleanup
      routes/
        auth.js         signup, login, profile
        skills.js       skills I teach / want to learn
        matches.js      match suggestions and scoring
        requests.js     swap requests (send, accept, decline, done)
        reviews.js      ratings and reviews
        chat.js         real-time chat for accepted swaps
    public/
      index.html        page shell
      styles.css        all styling (colours are defined at the top)
      app.js            all browser logic (login, tabs, matches, requests, chat)

## How matching works
- **Discover** shows one student at a time. Swipe right (or tap the heart) to ask for a swap, left to pass.
- When two students both swipe right, it is a match and a chat opens in the **Matches** tab.
- Skills that overlap with yours are highlighted on the card.
- Demo students (@demo.com) always swipe right back so you can see the match screen. Turn this off in server/routes/swipes.js.

## Demo students
24 demo students (password demo123, emails like ananya@demo.com) are added automatically on start-up.
Students that already exist are skipped, so your own data is never overwritten. The list is in server/demoData.js.
