import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { listAllUsers } from "./lib/firebase-admin";

async function run() {
    try {
        const users = await listAllUsers();
        console.log("Success, total users in Firebase Auth:", users.length);
        const fop = users.find(u => u.uid.startsWith("FOp7q"));
        console.log("Found FOp7q?:", fop);
        const typ = users.find(u => u.uid.startsWith("TYpOb"));
        console.log("Found TYpOb?:", typ);
    } catch (e) {
        console.error(e);
    }
}
run();
