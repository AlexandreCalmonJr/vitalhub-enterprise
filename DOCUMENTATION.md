# 🏥 VitalHub Enterprise — Documentação Oficial

Este documento consolida os pilares de negócio, requisitos técnicos e planejamento estratégico da plataforma **VitalHub Enterprise (v2.0)**.

---

## 1. Requisitos do Sistema

### 📝 Requisitos Funcionais (RF)
| ID | Funcionalidade | Descrição |
|:---|:---|:---|
| **RF01** | Autenticação Segura | O sistema deve permitir login e registro de usuários com 4 perfis distintos via JWT. |
| **RF02** | Wizard de Agendamento | Processo intuitivo de 4 passos para marcação de consultas com filtros inteligentes. |
| **RF03** | Prontuário SOAP | Registro clínico completo (Subjetivo, Objetivo, Avaliação, Plano) para médicos. |
| **RF04** | Geração de Documentos | Emissão automática de receitas e pedidos de exames em formato PDF. |
| **RF05** | Dashboards Analíticos | Visualização de métricas financeiras e fluxo de pacientes em tempo real. |
| **RF06** | Gestão de Usuários | Admin pode criar, editar e desativar contas de profissionais e recepcionistas. |
| **RF07** | Teleconsulta | Integração de links dinâmicos para salas de vídeo (Zoom/Meet/Teams). |
| **RF08** | Dark Mode | Alternância de tema visual (Dark/Light) persistente por sessão. |

### ⚙️ Requisitos Não Funcionais (RNF)
| ID | Categoria | Descrição |
|:---|:---|:---|
| **RNF01** | Estética | Interface baseada em **Glassmorphism** e **Navy Premium Design**. |
| **RNF02** | Performance | Tempo de resposta da API inferior a 200ms para operações CRUD. |
| **RNF03** | Segurança | Criptografia de senhas com bcrypt e proteção de rotas via RBAC (Role-Based Access Control). |
| **RNF04** | Arquitetura | Estrutura de **Monorepo** para sincronia entre Frontend (React) e Backend (Node.js). |
| **RNF05** | Disponibilidade | Deploy em infraestrutura Cloud (Railway) com suporte a variáveis de ambiente separadas. |
| **RNF06** | Responsividade | Design adaptável para dispositivos móveis, tablets e desktops (Full Responsive). |

---

## 2. Regras de Negócio (RN)

| ID | Regra | Detalhamento |
|:---|:---|:---|
| **RN01** | Motor Anti-Conflito | Um profissional não pode ter dois agendamentos no mesmo horário/data. |
| **RN02** | Hierarquia RBAC | Pacientes só veem seus dados; Médicos veem seus pacientes; Admin/Recepção veem visão global. |
| **RN03** | Agendamento Restrito | Pacientes só agendam para si mesmos. Recepção pode agendar para qualquer paciente cadastrado. |
| **RN04** | Registro de Atendimento | Um agendamento só pode ser movido para 'Realizado' após o preenchimento do prontuário. |
| **RN05** | Cancelamento | O sistema deve bloquear cancelamentos feitos por pacientes com menos de 24h de antecedência. |
| **RN06** | Receituário Digital | Toda receita gerada deve conter o CRM e assinatura digital do médico logado. |

---

## 🎨 BMI Canvas (Business Model Canvas)

| Bloco | Descrição |
|:---|:---|
| **Proposta de Valor** | Gestão clínica 360° com estética premium, eliminando conflitos de agenda e otimizando o fluxo de atendimento. |
| **Segmentos de Clientes** | Clínicas médicas particulares, policlínicas, profissionais de saúde autônomos e pacientes. |
| **Canais** | Web App (SaaS), Portal do Paciente, Dashboards Administrativos. |
| **Relacionamento** | Autoatendimento (Patient Portal) e Suporte Técnico B2B. |
| **Fontes de Receita** | Modelo de assinatura SaaS (Tiered Pricing) ou Licenciamento Enterprise. |
| **Recursos-Chave** | Infraestrutura em Nuvem, Algoritmos de Agendamento, Segurança de Dados (LGPD). |
| **Atividades-Chave** | Desenvolvimento contínuo, suporte ao cliente e manutenção de servidores. |
| **Parcerias-Chave** | Gateways de pagamento, Provedores Cloud (Railway), API de vídeo para Teleconsulta. |
| **Estrutura de Custos** | Custos operacionais de Cloud, desenvolvimento e marketing. |

---

## 🚀 PM Canvas (Project Management Canvas)

| Bloco | Descrição |
|:---|:---|
| **Justificativa** | Modernização da gestão clínica e centralização da jornada do paciente em uma plataforma única. |
| **Objetivo SMART** | Lançar a v2.0 Enterprise com suporte a multi-perfis e teleconsulta em 90 dias. |
| **Benefícios** | Agilidade operacional, redução de faltas (no-show) e organização financeira. |
| **Produto** | VitalHub Enterprise (Plataforma Monorepo Full-stack). |
| **Stakeholders** | Proprietários de clínicas, Médicos, Recepcionistas, Pacientes e Desenvolvedores. |
| **Premissas** | Base de dados MySQL disponível; Servidores cloud ativos; Designs Figma aprovados. |
| **Restrições** | Limite orçamentário para infraestrutura; Conformidade com normas de saúde e LGPD. |
| **Riscos** | Vazamento de dados; Instabilidade da rede; Baixa adesão inicial pela equipe médica. |
| **Timeline** | v1.0 (MVP) → v2.0 (Enterprise Overhaul) → v3.0 (Expansão Mobile). |

---

*Documento gerado oficialmente para o projeto VitalHub Enterprise.*
