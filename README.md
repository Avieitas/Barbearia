# Barbearia do Natã Garcia

Site público e painel do proprietário para agendamento online, desenvolvidos com React, TypeScript, Vite e Supabase. A identidade está configurada para o bairro Atlântica, em Rio das Ostras - RJ.

## Rodar localmente

```bash
npm install
cp .env.example .env.local
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do projeto Supabase e rode:

```bash
npm run dev
```

Sem as variáveis do Supabase, o site exibe uma prévia do menu, mas não aceita agendamentos nem entra no painel.

## Preparar o Supabase

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Aplique `supabase/migrations/20261015000000_barbearia.sql` pelo SQL Editor do Supabase.
3. Em **Authentication → Users**, crie uma conta para o proprietário. Mantenha o cadastro público desativado.
4. No SQL Editor, libere somente o usuário do proprietário, substituindo pelo UUID da conta:

   ```sql
   insert into public.profiles (user_id, role)
   values ('UUID-DO-USUARIO', 'owner');
   ```

5. Copie a URL do projeto e a chave publicável/anon para `.env.local` e inicie o site novamente.
6. Depois de entrar no painel, ajuste os serviços, horários, WhatsApp e endereço do estabelecimento.

As reservas são registradas por uma função transacional no banco. Clientes não têm acesso de leitura aos dados pessoais ou à lista de reservas; apenas o proprietário autorizado pode consultar a agenda. Horários são calculados e novamente validados no momento da reserva.
