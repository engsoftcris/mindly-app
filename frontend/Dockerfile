FROM node:20-slim

WORKDIR /app

# Copia dependências primeiro para cache do Docker
COPY package*.json ./
RUN npm install

# Copia o código
COPY . .

# Porta do Vite
EXPOSE 5173

# O --host é obrigatório para o Docker conseguir expor a porta
CMD ["npm", "run", "dev", "--", "--host"]
