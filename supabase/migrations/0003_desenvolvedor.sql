-- Papel de desenvolvedor: quem administra as contas pela tela "Desenvolvedor" do app.
-- A coluna só é lida e alterada pela função de servidor `admin` (supabase/functions/admin), que usa a
-- chave secreta. Pelo app, cada pessoa continua vendo apenas a própria linha e sem poder alterá-la.
alter table membros add column admin boolean not null default false;

-- O primeiro desenvolvedor é definido aqui, direto no banco; os próximos, pela tela.
-- (Aplicado no projeto em 25/11/2026 para a única conta existente na época.)
update membros set admin = true
where user_id = (select id from auth.users order by created_at limit 1)
  and (select count(*) from auth.users) = 1;
