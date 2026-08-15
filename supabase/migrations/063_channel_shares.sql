-- Create channel_shares table for sharing entire video library publicly

CREATE TABLE IF NOT EXISTS channel_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    access_level VARCHAR(20) DEFAULT 'view' CHECK (access_level IN ('view')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_channel_shares_token ON channel_shares(token);
CREATE INDEX idx_channel_shares_club ON channel_shares(club_id);
CREATE INDEX idx_channel_shares_created_by ON channel_shares(created_by);

-- Trigger for updated_at column
DROP TRIGGER IF EXISTS trg_channel_shares_updated_at ON channel_shares;
CREATE TRIGGER trg_channel_shares_updated_at BEFORE UPDATE ON channel_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE channel_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read a channel share token (required for public links)
CREATE POLICY "channel_shares: leer por token" ON channel_shares
    FOR SELECT USING (is_active = true);

-- Only creator or admin can create channel shares
CREATE POLICY "channel_shares: crear solo owner/admin" ON channel_shares
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    );

-- Only creator or admin can update channel shares
CREATE POLICY "channel_shares: update solo owner/admin" ON channel_shares
    FOR UPDATE USING (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    )
    WITH CHECK (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    );

-- Only creator or admin can delete channel shares
CREATE POLICY "channel_shares: delete solo owner/admin" ON channel_shares
    FOR DELETE USING (
        created_by = auth.uid()
        OR current_usuario_rol() = 'Administrador'
    );
