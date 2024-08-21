# Указываем базовый образ
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install sqlite3
RUN npm install

# Копируем остальной код приложения
COPY . .

# Открываем порт для приложения
EXPOSE 3000

# Команда для запуска сервера
CMD ["node", "server.js"]
