
# Plano: Suavizar a Cor de Fundo da Seção de Urgência

## Resumo
Atualmente a seção de urgência usa `bg-castle` (vermelho vibrante). Vamos substituir por uma cor mais suave e acolhedora.

## Alteração Proposta

**Arquivo:** `src/components/landing/UrgencySection.tsx`

**De:**
```tsx
<section className="py-16 bg-castle relative overflow-hidden">
```

**Para:**
```tsx
<section className="py-16 bg-gradient-to-br from-festive/90 to-secondary relative overflow-hidden">
```

Isso criará um gradiente suave de laranja para amarelo, mantendo a vibração festiva mas com uma aparência mais acolhedora e menos agressiva que o vermelho puro.

---

### Detalhes Técnicos

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Fundo | `bg-castle` (vermelho sólido) | Gradiente laranja → amarelo |
| Cores CSS | `hsl(5 85% 55%)` | `hsl(25 95% 55%)` → `hsl(45 95% 55%)` |
| Sensação | Urgência intensa | Alegre e convidativo |

A mudança é simples: apenas 1 linha de código no arquivo `UrgencySection.tsx`.
