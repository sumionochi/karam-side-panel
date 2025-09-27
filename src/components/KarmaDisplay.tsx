// KaramDisplay.tsx
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  KarmaService,
  type UserKarmaData,
  type KarmaEvent,
} from "@/services/KarmaService";

interface KarmaDisplayProps {
  twitterUsername: string | null;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const KarmaDisplay = ({ twitterUsername }: KarmaDisplayProps) => {
  const [karmaData, setKarmaData] = useState<UserKarmaData | null>(null);
  const [recentEvents, setRecentEvents] = useState<KarmaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // normalize twitter handle once
  const normalizedHandle = useMemo(() => {
    if (!twitterUsername) return null;
    return twitterUsername.replace(/^@/, "").toLowerCase();
  }, [twitterUsername]);

  useEffect(() => {
    if (!normalizedHandle) {
      setKarmaData(null);
      setRecentEvents([]);
      setError(null);
      return;
    }

    const fetchKarmaData = async () => {
      setLoading(true);
      setError(null);

      try {
        const karmaService = new KarmaService();

        // 1) Resolve address by twitter handle
        const addr = await karmaService.getAddressByTwitterUsername(
          normalizedHandle
        );

        if (
          !addr ||
          typeof addr !== "string" ||
          addr.toLowerCase() === ZERO_ADDRESS
        ) {
          setError("User not found in karma system");
          setKarmaData(null);
          setRecentEvents([]);
          return;
        }

        // 2) User snapshot
        const userData = await karmaService.getUserKarmaData(addr);
        setKarmaData(userData);

        // 3) Recent events (limit in UI)
        const events = await karmaService.getRecentKarmaEvents(addr);
        setRecentEvents(Array.isArray(events) ? events.slice(0, 10) : []);
      } catch (err) {
        console.error("Error fetching karma data:", err);
        setError("Failed to fetch karma data");
        setKarmaData(null);
        setRecentEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKarmaData();
  }, [normalizedHandle]);

  // --------- Top-level empty/loader/error states (before tabs) ----------
  if (!twitterUsername) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black text-muted-foreground">
            NO USERNAME DETECTED
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black">LOADING...</div>
        </div>
      </Card>
    );
  }

  if (error || !karmaData) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            KARMA DATA
          </div>
          <div className="text-lg font-black text-destructive">
            {error || "NOT FOUND"}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            @{normalizedHandle} not registered in karma system
          </div>
        </div>
      </Card>
    );
  }

  // --------- Profile tab (primary) ----------
  const karmaValue = Number(karmaData.karma) || 0;
  const karmaColor =
    karmaValue > 500
      ? "text-karma-positive"
      : karmaValue < 100
      ? "text-karma-negative"
      : "text-karma-neutral";

  const shortAddr = `${karmaData.address.slice(0, 6)}...${karmaData.address.slice(
    -4
  )}`;

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid grid-cols-6 gap-1 w-full">
        <TabsTrigger value="profile" className="font-black text-xs">
          Profile
        </TabsTrigger>
        <TabsTrigger value="today" className="font-black text-xs">
          Today
        </TabsTrigger>
        <TabsTrigger value="alltime" className="font-black text-xs">
          All-time
        </TabsTrigger>
        <TabsTrigger value="history" className="font-black text-xs">
          History
        </TabsTrigger>
        <TabsTrigger value="admin" className="font-black text-xs">
          Admin
        </TabsTrigger>
        <TabsTrigger value="directory" className="font-black text-xs">
          Directory
        </TabsTrigger>
      </TabsList>

      {/* PROFILE (Fully implemented now) */}
      <TabsContent value="profile" className="mt-4 space-y-4">
        {/* Main Karma Card */}
        <Card className="border-2 border-border bg-card shadow-strong">
          <div className="p-4">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              KARMA PROFILE
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">USERNAME</span>
                <span className="font-black">@{normalizedHandle}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">KARMA</span>
                <span className={`text-2xl font-black ${karmaColor}`}>
                  {Math.floor(karmaValue)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">STATUS</span>
                {karmaData.isRegistered ? (
                  <Badge
                    variant="outline"
                    className="border-karma-positive text-karma-positive font-black"
                  >
                    REGISTERED
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-karma-negative text-karma-negative font-black"
                  >
                    NOT REGISTERED
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">ADDRESS: {shortAddr}</div>
            </div>
          </div>
        </Card>

        {/* Social Connections */}
        {(karmaData.socialConnections.githubUsername ||
          karmaData.socialConnections.discordUsername) && (
          <Card className="border-2 border-border bg-card shadow-sharp">
            <div className="p-4">
              <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
                SOCIAL CONNECTIONS
              </div>

              <div className="space-y-2">
                {karmaData.socialConnections.githubUsername && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">GITHUB</span>
                    <span className="text-xs font-black">
                      {karmaData.socialConnections.githubUsername}
                    </span>
                  </div>
                )}

                {karmaData.socialConnections.discordUsername && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">DISCORD</span>
                    <span className="text-xs font-black">
                      {karmaData.socialConnections.discordUsername}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Recent Activity (keep a lightweight feed here for profile) */}
        {recentEvents.length > 0 && (
          <Card className="border-2 border-border bg-card shadow-sharp">
            <div className="p-4">
              <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
                RECENT ACTIVITY
              </div>

              <div className="space-y-3">
                {recentEvents.slice(0, 5).map((event, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-xs font-black ${
                          event.type === "given"
                            ? "border-karma-positive text-karma-positive"
                            : "border-karma-negative text-karma-negative"
                        }`}
                      >
                        {event.type === "given" ? "+" : "-"}
                        {Math.floor(parseFloat(event.amount))}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>

                    {event.reason && (
                      <div className="text-xs text-muted-foreground">
                        "{event.reason}"
                      </div>
                    )}

                    {index < recentEvents.slice(0, 5).length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </TabsContent>

      {/* TODAY (placeholder for next step) */}
      <TabsContent value="today" className="mt-4">
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-6 text-center space-y-2">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              TODAY
            </div>
            <div className="text-xs text-muted-foreground">
              Coming soon: live usage bars (given vs 30, slashed vs 20) & per-pair stats.
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* ALL-TIME (placeholder for later) */}
      <TabsContent value="alltime" className="mt-4">
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-6 text-center space-y-2">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              ALL-TIME
            </div>
            <div className="text-xs text-muted-foreground">
              Coming soon: totals, net, first seen, top givers/recipients, reputation score.
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* HISTORY (placeholder for later) */}
      <TabsContent value="history" className="mt-4">
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-6 text-center space-y-2">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              HISTORY
            </div>
            <div className="text-xs text-muted-foreground">
              Coming soon: full event feed & daily chart of net karma.
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* ADMIN / SYSTEM (placeholder for later) */}
      <TabsContent value="admin" className="mt-4">
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-6 text-center space-y-2">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              ADMIN / SYSTEM
            </div>
            <div className="text-xs text-muted-foreground">
              Coming soon: contract address/chain, owner, lastUpdated, maintenance logs, user count.
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* DIRECTORY / LEADERBOARD (placeholder for later) */}
      <TabsContent value="directory" className="mt-4">
        <Card className="border-2 border-border bg-card shadow-sharp">
          <div className="p-6 text-center space-y-2">
            <div className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              DIRECTORY / LEADERBOARD
            </div>
            <div className="text-xs text-muted-foreground">
              Coming soon: users list & top karma holders (needs allUsersLength / getAllUsers).
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
};