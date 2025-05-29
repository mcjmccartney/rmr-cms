"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Info, Play, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MatchSummary {
  totalSessions: number;
  totalClients: number;
  matchedSessions: number;
  unmatchedSessions: number;
  dryRun: boolean;
  updateResults?: { success: number; errors: number } | null;
  matches: Array<{
    sessionId: string;
    email: string;
    clientId: string;
    clientName: string;
    dogName?: string;
  }>;
  unmatched: Array<{
    sessionId: string;
    email?: string;
    reason: string;
  }>;
  hasMoreMatches: boolean;
  hasMoreUnmatched: boolean;
}

interface SystemState {
  hasEmailColumn: boolean;
  availableColumns: string[];
  counts: {
    totalSessions: number;
    totalClients: number;
    sessionsWithClientId: number;
    sessionsWithoutClientId: number;
  };
}

export default function MatchSessionsPage() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ summary: MatchSummary } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load system state on component mount
  useEffect(() => {
    loadSystemState();
  }, []);

  const loadSystemState = async () => {
    try {
      setIsLoadingState(true);
      const response = await fetch('/api/admin/match-sessions');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load system state');
      }
      
      setSystemState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system state');
    } finally {
      setIsLoadingState(false);
    }
  };

  const runMatching = async (dryRun: boolean = true) => {
    try {
      setIsMatching(true);
      setError(null);
      
      const response = await fetch('/api/admin/match-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to run matching process');
      }
      
      setMatchResult(data);
      
      // Reload system state after actual updates
      if (!dryRun) {
        await loadSystemState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run matching process');
    } finally {
      setIsMatching(false);
    }
  };

  if (isLoadingState) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading system state...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Match Sessions to Clients</h1>
          <p className="text-muted-foreground">
            Link sessions to clients by matching email addresses
          </p>
        </div>
        <Button onClick={loadSystemState} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System State Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            System State
          </CardTitle>
          <CardDescription>
            Current state of sessions and clients in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemState && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Database Structure</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={systemState.hasEmailColumn ? "default" : "destructive"}>
                    {systemState.hasEmailColumn ? "✓" : "✗"} Email Column
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Available columns: {systemState.availableColumns.join(', ')}
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Data Counts</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Sessions: <strong>{systemState.counts.totalSessions}</strong></div>
                  <div>Total Clients: <strong>{systemState.counts.totalClients}</strong></div>
                  <div>Linked Sessions: <strong>{systemState.counts.sessionsWithClientId}</strong></div>
                  <div>Unlinked Sessions: <strong>{systemState.counts.sessionsWithoutClientId}</strong></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Run the matching process to link sessions to clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!systemState?.hasEmailColumn ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Email column not found in sessions table. Please add an email column to the sessions table first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={() => runMatching(true)}
                disabled={isMatching}
                variant="outline"
              >
                {isMatching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Preview Changes (Dry Run)
              </Button>
              
              <Button
                onClick={() => runMatching(false)}
                disabled={isMatching || !matchResult}
                variant="default"
              >
                {isMatching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Apply Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {matchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Matching Results
            </CardTitle>
            <CardDescription>
              {matchResult.summary.dryRun ? 'Preview of changes (no data was modified)' : 'Changes have been applied'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{matchResult.summary.matchedSessions}</div>
                <div className="text-sm text-muted-foreground">Matched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{matchResult.summary.unmatchedSessions}</div>
                <div className="text-sm text-muted-foreground">Unmatched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{matchResult.summary.totalSessions}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{matchResult.summary.totalClients}</div>
                <div className="text-sm text-muted-foreground">Total Clients</div>
              </div>
            </div>

            {/* Update Results */}
            {matchResult.summary.updateResults && (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{matchResult.summary.updateResults.success}</div>
                  <div className="text-sm text-muted-foreground">Successfully Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{matchResult.summary.updateResults.errors}</div>
                  <div className="text-sm text-muted-foreground">Update Errors</div>
                </div>
              </div>
            )}

            {/* Matched Sessions Preview */}
            {matchResult.summary.matches.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Matched Sessions {matchResult.summary.hasMoreMatches && '(showing first 10)'}</h4>
                <div className="space-y-2">
                  {matchResult.summary.matches.map((match) => (
                    <div key={match.sessionId} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div>
                        <span className="font-medium">{match.email}</span>
                        <span className="text-muted-foreground"> → {match.clientName}</span>
                        {match.dogName && <span className="text-muted-foreground"> w/ {match.dogName}</span>}
                      </div>
                      <Badge variant="outline">{match.sessionId.slice(0, 8)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmatched Sessions */}
            {matchResult.summary.unmatched.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Unmatched Sessions {matchResult.summary.hasMoreUnmatched && '(showing first 10)'}</h4>
                <div className="space-y-2">
                  {matchResult.summary.unmatched.map((unmatched) => (
                    <div key={unmatched.sessionId} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <div>
                        <span className="font-medium">{unmatched.email || 'No email'}</span>
                        <span className="text-muted-foreground"> - {unmatched.reason}</span>
                      </div>
                      <Badge variant="outline">{unmatched.sessionId.slice(0, 8)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
