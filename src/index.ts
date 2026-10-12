import { Canvas } from "./canvas";
import { Renderer } from "./renderer";

function main(): void {
    const canvas = Canvas.createFullscreen();

    const renderer = new Renderer(canvas);
}

main();
