# Diretrizes do Projeto AtgLib

## Visão Geral
AtgLib é um sistema de gestão de bibliotecas focado em experiência mobile-first, com design moderno em tons de Midnight Blue e integração com IA.

## Regras de Design
- **Paleta de Cores:** Fundo principal `#020617`, cartões `#1e293b/40`, detalhes em `#0ea5e9` (Sky-500).
- **Tipografia:** Uso de fontes sem-serifa com pesos variados (font-black para títulos, font-medium para corpo).
- **Interação:** Todas as ações devem ter feedback visual (escala, opacidade) e transições suaves via `motion`.

## Arquitetura de Permissões
- **Management (Gestão):** Acesso ao dashboard de analytics, diretório de membros (adição/exclusão), e configurações do sistema.
- **Student (Aluno):** Acesso ao catálogo, perfil pessoal, reservas e recomendações de IA.
- **Restrição:** Usuários sem papel `management` NÃO devem visualizar ou acessar a aba de Configurações ou Gerenciamento de Usuários.

## Funcionalidades Críticas
- **IA (AtgLib AI):** Utiliza o SDK do Gemini para fornecer recomendações personalizadas no dashboard do aluno.
- **PWA:** O app deve ser instalável (manifest.json + service worker). Sempre manter os arquivos de PWA atualizados.
- **Backup:** Sistema automático baseado no `localStorage`. Não remover a lógica de verificação de frequência de backup no `App.tsx`.

## Fluxo de Autenticação
- Usuários padrão de teste: `ADMIN-001` (senha: `admin`). Ativar sempre um fallback de administrador caso o armazenamento local esteja limpo.
