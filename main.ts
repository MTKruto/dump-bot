import { ChatType, Client, types } from "mtkruto/mod.ts";
import { StorageDenoKV } from "mtkruto/storage/1_storage_deno_kv.ts";
import env from "./env.ts";

const client = new Client(new StorageDenoKV(), env.API_ID, env.API_HASH, { initialDc: "1" }); // the initialDc parameters makes sure that we connect to prod servers

client.on("authorizationState", async ({ authorizationState: { authorized } }) => { // this is called when the client’s connection state is changed, and should be applied before authorizing the client
  if (authorized) {
    const me = await client.getMe();
    console.log(`Running as @${me.username}...`);
  }
});

await client.start(env.BOT_TOKEN);

client.use(async (update, next) => {
  const chat = (update.callbackQuery?.message ?? update.message ?? update.editedMessage)?.chat;
  if (chat && chat.type == ChatType.Private) {
    try {
      await next();
    } catch (err) {
      if (err instanceof types.RPCError && err.errorMessage.startsWith("FLOOD_WAIT_")) {
        const duration = Number(err.errorMessage.replace("FLOOD_WAIT_", ""));
        console.log("Sleeping for", duration, "seconds...");
        await new Promise((r) => setTimeout(r, duration * 1000));
        try {
          await next();
        } catch (err) {
          console.error(err);
        }
      } else {
        console.error(err);
      }
    }
  }
});

client.use(async (update) => {
  const chat = (update.callbackQuery?.message ?? update.message ?? update.editedMessage)?.chat!;
  const text = JSON.stringify(update, null, 2);
  await client.sendMessage(chat.id, text, { entities: [{ type: "code", offset: 0, length: text.length }] });
});
