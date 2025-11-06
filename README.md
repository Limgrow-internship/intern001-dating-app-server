#after config db run migration cmd
npx migrate-mongo create  <name migration>


# run docker
docker-compose up --build

#down
docker-compose down