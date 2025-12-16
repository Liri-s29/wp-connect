1. Avg time period to sell through rate. - avg time period of active phones. evlo naal phone active aa iruku for seller.
2. Add condition column to products view. 
3. Standardize iphone names during scrape on AI Layer
4. Get image count from the products view. HIGH EFFORT


 git pull origin main && cd gpt && npm install && npx prisma migrate deploy && cd ../dashboard && npm install && npx prisma generate && npm run build && pm2 restart dashboard

 ssh root@172.237.44.119
 JVV@whJqc594c@A

  cd /path/to/wp-connect
  git pull

  # Install dependencies (if any changed)
  cd gpt && npm install
  cd ../dashboard && npm install

  # Add the condition column to database
  cd ../gpt
  npx prisma db execute --stdin <<< "ALTER TABLE products ADD COLUMN IF NOT EXISTS condition TEXT;"

  # Regenerate Prisma clients
  npx prisma generate
  cd ../dashboard && npx prisma generate

  # Restart your dashboard (if using PM2)
  pm2 restart dashboard