import { ExampleGame } from "./example-game";

async function main(): Promise<void> {
    const exampleGame = await ExampleGame.init();

    exampleGame.run();
}

main();
