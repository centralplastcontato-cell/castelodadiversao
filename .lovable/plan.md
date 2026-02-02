

# Plano: Correção Definitiva do Sistema de Verificação de Roles

## Diagnóstico do Problema

Após análise detalhada, identifiquei que:

1. **Banco de dados está correto** - O usuário `castelodadiversao@gmail.com` está cadastrado como `admin`
2. **Políticas RLS estão corretas** - As políticas são PERMISSIVAS e permitem que usuários vejam sua própria role
3. **O problema está no código** - O hook `useUserRole` pode estar falhando silenciosamente

O problema mais provável é que o hook está tentando buscar a role **antes** do `userId` estar disponível corretamente, ou há um erro sendo tratado de forma incorreta.

## Solução Proposta

### Fase 1: Refatorar o Hook useUserRole (Mais Robusto)

Vou reescrever o hook com as seguintes melhorias:
- Adicionar logs detalhados para debug
- Garantir que só faz o fetch quando o userId está realmente disponível
- Implementar retry mais inteligente
- Verificar se a sessão está ativa antes de buscar

### Fase 2: Corrigir a Página Users.tsx

- Adicionar verificação adicional do estado de autenticação
- Só mostrar "Acesso negado" se tivermos certeza absoluta que o usuário não é admin
- Adicionar um delay antes de redirecionar para evitar race conditions

### Fase 3: Testar o Fluxo Completo

Após as correções, você deverá:
1. Fazer logout completo
2. Fechar e reabrir o navegador (limpar cache se necessário)
3. Fazer login novamente com `castelodadiversao@gmail.com`
4. Acessar `/admin` e depois `/users`

---

## Detalhes Técnicos

### Hook Refatorado (`src/hooks/useUserRole.ts`)

```typescript
// Principais mudanças:
// 1. Verificar se há uma sessão ativa antes de buscar
// 2. Adicionar logs para diagnóstico
// 3. Implementar retry com backoff exponencial
// 4. Garantir que hasFetched só é true após resposta definitiva
```

### Verificação na Página Users (`src/pages/Users.tsx`)

```typescript
// Mudanças:
// 1. Só navegar para "/admin" após confirmação absoluta
// 2. Adicionar um estado de "checking" para evitar flash
// 3. Mostrar loading enquanto verifica permissões
```

---

## Alternativa: Recriar o Usuário Admin

Se preferir não fazer alterações no código, posso:
1. Desativar o usuário atual via banco
2. Criar um novo usuário admin via Edge Function (você precisará acessar pelo console do Lovable Cloud)

No entanto, **recomendo fortemente a correção do código**, pois o problema pode acontecer com outros usuários no futuro.

---

## Resultado Esperado

Após implementar:
- O login funcionará sem mensagens de "Acesso negado" incorretas
- O sistema será mais resiliente a condições de corrida
- Teremos logs que ajudarão a diagnosticar problemas futuros

