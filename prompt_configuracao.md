# Prompt de Configuração Automática - Área de Membros, Supabase & Webhook (Resend)

Você pode copiar o prompt abaixo e utilizá-lo nas próximas conversas para configurar um sistema idêntico em outros projetos. Basta substituir as informações entre colchetes `[ ]`.

---

## Copie a partir desta linha:

```markdown
Por favor, configure as tabelas do banco de dados no Supabase e a área de membros para o meu projeto utilizando as seguintes especificações:

### 1. Dados de Conexão e APIs (Substituir se necessário)
- **Supabase URL:** [URL_DO_SUPABASE]
- **Supabase Anon Key:** [CHAVE_ANON_PUBLICA]
- **Resend API Key:** [CHAVE_API_DO_RESEND]
- **Domínio de Envio do E-mail:** [DOMINIO_DE_ENVIO] (ex: suporte@seudominio.com)
- **Link da Área de Membros:** [LINK_DA_AREA_DE_MEMBROS] (ex: https://seudominio.com/area-de-membros/)

---

### 2. Estrutura do Banco de Dados (Supabase)
Crie as seguintes tabelas e regras:

#### Tabela `members`
- `id`: UUID chave primária (default: `gen_random_uuid()`)
- `email`: TEXT único e em minúsculas (indexado para busca rápida)
- `name`: TEXT
- `plan`: TEXT (valores aceitos: 'Básico' ou 'Completo')
- `orderbumps`: TEXT[] (array contendo os títulos dos orderbumps comprados, default `{}`)
- `certificate_name`: TEXT (só pode ser definido uma única vez)
- `certificate_date`: TEXT
- `created_at`: TIMESTAMPTZ (default `now()`)

#### Tabela `ggcheckout_webhooks`
- `id`: BIGSERIAL chave primária
- `payload`: JSONB
- `created_at`: TIMESTAMPTZ (default `now()`)

#### Trigger de Processamento do Webhook
Crie uma trigger `AFTER INSERT ON ggcheckout_webhooks` que processe a venda:
1. Verifique se o status do pagamento é `paid` ou o evento é `pix.paid`.
2. Identifique o plano principal procurando no payload (objeto `product` ou array `products` onde o type é `main`). Se o título contiver "completo" ou "full" (case-insensitive), o plano é **Completo**, caso contrário é **Básico**.
3. Extraia todos os produtos com type `orderbump` da lista `products` e insira/atualize na coluna `orderbumps` do membro.
4. Faça o `UPSERT` na tabela `members` usando o e-mail em minúsculas como chave de conflito. Se o e-mail já existir, mantenha o plano como `Completo` caso o usuário já o tenha (evitando downgrade) e mescle de forma única os novos orderbumps com os já adquiridos.

#### Trigger de Emissão Única do Certificado
Crie uma trigger `BEFORE UPDATE ON members` que impeça alterações na coluna `certificate_name` caso ela já esteja preenchida, garantindo que o certificado só seja gerado uma vez.

#### Políticas de RLS
Ative Row Level Security na tabela `members` e permita leitura (`SELECT`) e atualização (`UPDATE`) pública (anon) sem restrições complexas para que a área de membros estática possa ler e preencher o nome do certificado diretamente.

---

### 3. Configuração da Área de Membros (Frontend)
- Adicione a biblioteca do Supabase JS via CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`) no HTML.
- Modifique a lógica do script de login para:
  1. Consultar a tabela `members` no Supabase usando o e-mail fornecido (convertido para minúsculas).
  2. Se não existir, exibir o erro: "E-mail incorreto ou não cadastrado. Use seu e-mail de compra."
  3. Se existir, permitir login e salvar os dados do membro na sessão (`sessionStorage`).
- Implemente o controle de exibição de planos:
  - **Plano Básico:** Deve ocultar todos os bônus, o card do certificado e a barra de progresso.
  - **Plano Completo:** Deve liberar todo o conteúdo, bônus e a emissão do certificado.
- Ao preencher o certificado, faça o update no banco no registro do membro onde `certificate_name` for nulo. Atualize também os dados locais da sessão.

---

### 4. Supabase Edge Function & Envio de E-mail (Resend)
Crie e publique uma Edge Function chamada `ggcheckout-webhook` com `verify_jwt: false`. Ela deve:
1. Receber o webhook da GGcheckout por POST.
2. Inserir o payload na tabela `ggcheckout_webhooks`.
3. Se o pagamento for aprovado, disparar um e-mail pelo Resend com o seguinte template HTML (inline CSS):
   - **Remetente:** Suporte <suporte@[DOMINIO_DE_ENVIO]>
   - **Assunto:** Seu acesso à Área de Membros - [NOME_DO_PRODUTO]
   - **Template:**
     - Saudação e felicitações pelo plano adquirido (Básico ou Completo).
     - **Aviso explícito:** *"O login é feito exclusivamente com o seu e-mail de compra ([E-MAIL]). Não existe senha ou código de acesso."*
     - Botão verde/escuro com o link da área de membros.
     - Texto de apoio abaixo do botão contendo o link direto clicável para casos de falha.
     - **Card de Orderbump:** Se o cliente comprou algum orderbump, renderize um bloco com fundo verde claro (`#f4fbf6`), borda esquerda verde (`4px solid #10b981`), texto verde escuro contendo: *"🎉 MATERIAL ADICIONAL LIBERADO! O seu bônus adicional [NOME_DO_ORDERBUMP] também já está disponível na sua conta!"* para cada orderbump comprado.
```
