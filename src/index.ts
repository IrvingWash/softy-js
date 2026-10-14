import { ExampleApp } from "./example-app/example-app";

async function main(): Promise<void> {
    const app = new ExampleApp();

    await app.init();

    app.run();
}

main();
