-- Create share_tokens table for sharing match videos publicly

CREATE TABLE IF NOT EXISTS share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_report_id TEXT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    event_id TEXT,
    start_timestamp DECIMAL,
    end_timestamp DECIMAL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    access_level VARCHAR(20) DEFAULT 'view' CHECK (access_level IN ('view', 'edit')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_match_report ON share_tokens(match_report_id);
CREATE INDEX idx_share_tokens_club ON share_tokens(club_id);
CREATE INDEX idx_share_tokens_created_by ON share_tokens(created_by);

-- Trigger for updated_at column
DROP TRIGGER IF EXISTS trg_share_tokens_updated_at ON share_tokens;
CREATE TRIGGER trg_share_tokens_updated_at BEFORE UPDATE ON share_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can read a share token by its token (required to validate public links)
CREATE POLICY "share_tokens: leer por token" ON share_tokens
    FOR SELECT USING (true);

-- Only creator or admin can create share tokens
CREATE POLICY "share_tokens: crear solo owner/admin" ON share_tokens
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    );

-- Only creator or admin can update share tokens
CREATE POLICY "share_tokens: update solo owner/admin" ON share_tokens
    FOR UPDATE USING (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    )
    WITH CHECK (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    );

-- Only creator or admin can delete share tokens
CREATE POLICY "share_tokens: delete solo owner/admin" ON share_tokens
    FOR DELETE USING (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    );
