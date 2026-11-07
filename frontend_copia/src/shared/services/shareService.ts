import { shareTokensService, ShareToken } from './dataService';
import { supabase } from './supabaseClient';

/**
 * Generates a random token for sharing videos.
 * @returns A random 32-character alphanumeric token
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Creates a shareable link for a match report.
 * @param matchReportId - The ID of the match report to share
 * @param eventId - Optional ID of a specific event (gol, ocasión, duelo)
 * @param startTimestamp - Optional start timestamp in seconds
 * @param endTimestamp - Optional end timestamp in seconds
 * @param expiresAt - Optional expiration date
 * @returns The created share token
 */
export async function createShareLink(
  matchReportId: string,
  eventId?: string | null,
  startTimestamp?: number | null,
  endTimestamp?: number | null,
  expiresAt?: string | null
): Promise<ShareToken> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const token = generateShareToken();
  const shareToken = await shareTokensService.create({
    match_report_id: matchReportId,
    token,
    event_id: eventId || null,
    start_timestamp: startTimestamp || null,
    end_timestamp: endTimestamp || null,
    created_by: user.id,
    access_level: 'view',
  });

  return shareToken;
}

/**
 * Gets the public share URL for a token.
 * @param token - The share token
 * @returns The full shareable URL
 */
export function getShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

/**
 * Copies a share URL to the clipboard.
 * @param token - The share token
 */
export async function copyShareUrlToClipboard(token: string): Promise<void> {
  const url = getShareUrl(token);
  try {
    await navigator.clipboard.writeText(url);
  } catch (err) {
    console.error('Failed to copy share URL:', err);
    throw new Error('No se pudo copiar el enlace');
  }
}

/**
 * Retrieves a match report by a share token without authentication.
 * This function is used by the public share view.
 * @param token - The share token
 * @returns The match report data and share token info, or null if invalid/expired
 */
export async function getMatchReportByToken(token: string): Promise<{
  shareToken: ShareToken;
  matchReport: any;
} | null> {
  try {
    // First, fetch the share token
    const { data: shareTokens, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !shareTokens) {
      return null;
    }

    const shareToken = shareTokens as ShareToken;

    // Check if token has expired
    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      return null;
    }

    // Fetch the match report
    const { data: matchReport, error: reportError } = await supabase
      .from('match_reports')
      .select('*')
      .eq('id', shareToken.match_report_id)
      .single();

    if (reportError || !matchReport) {
      return null;
    }

    return {
      shareToken,
      matchReport,
    };
  } catch (err) {
    console.error('Error retrieving shared match report:', err);
    return null;
  }
}

/**
 * Deletes a share link.
 * @param token - The share token to delete
 */
export async function deleteShareLink(token: string): Promise<void> {
  const shareToken = await shareTokensService.list();
  const tokenToDelete = shareToken.find(t => t.token === token);
  if (tokenToDelete) {
    await shareTokensService.remove(tokenToDelete.id);
  }
}

/**
 * Creates a shareable link for the entire channel.
 * @param clubId - The ID of the club whose channel to share
 * @param expiresAt - Optional expiration date
 * @returns The created channel share token
 */
export async function createChannelShareLink(
  clubId: string,
  expiresAt?: string | null
): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const token = generateShareToken();
  const { data, error } = await supabase
    .from('channel_shares')
    .insert({
      club_id: clubId,
      token,
      created_by: user.id,
      expires_at: expiresAt || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gets an existing channel share link or creates a new one if none exists.
 * @param clubId - The ID of the club
 * @returns The channel share token
 */
export async function getOrCreateChannelShareLink(clubId: string): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if a channel share already exists
  const { data: existing } = await supabase
    .from('channel_shares')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return existing;
  }

  // Create a new channel share
  return createChannelShareLink(clubId);
}

/**
 * Gets the public channel URL for a token.
 * @param token - The channel share token
 * @returns The full shareable URL
 */
export function getChannelShareUrl(token: string): string {
  return `${window.location.origin}/public-channel/${token}`;
}

/**
 * Copies a channel share URL to the clipboard.
 * @param token - The channel share token
 */
export async function copyChannelShareUrlToClipboard(token: string): Promise<void> {
  const url = getChannelShareUrl(token);
  try {
    await navigator.clipboard.writeText(url);
  } catch (err) {
    console.error('Failed to copy channel share URL:', err);
    throw new Error('No se pudo copiar el enlace');
  }
}

/**
 * Retrieves a channel by share token without authentication.
 * This function is used by the public channel view.
 * @param token - The channel share token
 * @returns The club data and channel share info, or null if invalid/expired
 */
export async function getChannelByToken(token: string): Promise<{
  channelShare: any;
  club: any;
} | null> {
  try {
    // First, fetch the channel share token
    const { data: channelShare, error: tokenError } = await supabase
      .from('channel_shares')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (tokenError || !channelShare) {
      return null;
    }

    // Check if token has expired
    if (channelShare.expires_at && new Date(channelShare.expires_at) < new Date()) {
      return null;
    }

    // Fetch the club data
    const { data: club, error: clubError } = await supabase
      .from('clubes')
      .select('id, nombre, escudo_url')
      .eq('id', channelShare.club_id)
      .single();

    if (clubError || !club) {
      return null;
    }

    return {
      channelShare,
      club,
    };
  } catch (err) {
    console.error('Error retrieving shared channel:', err);
    return null;
  }
}

/**
 * Disables a channel share link.
 * @param token - The channel share token to disable
 */
export async function disableChannelShareLink(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('channel_shares')
    .update({ is_active: false })
    .eq('token', token)
    .eq('created_by', user.id);

  if (error) throw error;
}
