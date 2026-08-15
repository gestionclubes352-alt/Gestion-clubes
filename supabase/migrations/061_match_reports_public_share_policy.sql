-- Permite leer un match_report de forma anónima cuando existe un share_token
-- válido (no expirado) que apunta a él. Sin esto, la RLS existente de
-- match_reports ("leer si Activo") bloquea la vista pública /share/:token,
-- porque un visitante anónimo no tiene current_user_estado() = 'Activo'.

CREATE POLICY "match_reports: leer via share_token publico" ON match_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM share_tokens st
            WHERE st.match_report_id = match_reports.id
            AND (st.expires_at IS NULL OR st.expires_at > NOW())
        )
    );
