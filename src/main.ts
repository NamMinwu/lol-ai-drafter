import { authenticate } from "league-connect";
import https from "https";

async function main() {
  const creds = await authenticate({ awaitConnection: true });
  const auth = Buffer.from(`riot:${creds.password}`).toString("base64");

  setInterval(() => {
    const req = https.request(
      {
        hostname: "127.0.0.1",
        port: creds.port,
        path: "/lol-champ-select/v1/session",
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            console.log(
              "myTeam:",
              json.myTeam?.map((p: any) => p.championId)
            );
          } catch {
            /* ignore */
          }
        });
      }
    );

    req.on("error", () => {});
    req.end();
  }, 1000);
}

main();
