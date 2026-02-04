-- Add permission for team/equipe access
INSERT INTO permission_definitions (code, name, description, category, sort_order, is_active)
VALUES ('equipe.view', 'Acessar Equipe', 'Permite visualizar a aba Equipe na Central de Atendimento', 'Sistema', 75, true)
ON CONFLICT (code) DO NOTHING;