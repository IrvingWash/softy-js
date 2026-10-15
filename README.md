# SoftyJS

[Interactive demo](https://irvingwash.github.io/softy-js/)

SoftyJS is a port of my other project [Softy](https://github.com/IrvingWash/softy), a software 3D renderer, from Jai to TypeScript.
The port, as the original project, is written from scratch. It doesn't have any dependencies and implements a 3D renderer/rasterizer (including all the math) without using any Canvas drawing/rasterization API (the canvas only used as a surface).<br>
The prorjects, both this port and the original, are written by hand, without LLM assistance, because this is a educational endeavor.
I wanted to learn how 3D rendering works under the hood. Though, the algorithms here are far worse than used by GPU driver developers, the project still provides a nice enough API and can render recognizible geometry.

[Showcase](./showcas/softyjs.mp4)

Current speed, when rendering a textured mesh, is 12000 triangles per 20FPS at Full HD resolution.<br>
The speed could be further improved by caching some computations and using workers for multithreading, but that is out of scope of this project. For me, having very easily readable code here is more important.
Currently total count of "library" code (that is the renderer itself, the math implementation, obj/mtl loader) is only 1034 LOC, which I am really proud of and don't want to increase this number drastically.

## Capabilities
- Full implementation for vector and matrix math (no dependencies like gl-matrix are used). In the original project I also added typsti [lecture notes](https://github.com/IrvingWash/softy/tree/main/notes) where all the math is explained.
- Line rasterization
- Texture mapping and rasterization using barycentric weights
- Flat-shaded triangles
- Textured triangles
- Simple per fragment shading for textured meshes
- Simple per face shading for flat-shaded meshes (meshes with only vertex colors)
- Backface culling
- Depth testing using a depth buffer
- Abstracted model/view/projection transformation support
- A naive OBJ/MTL parser

## Architecture

There are four independent libraries:
- `canvas.ts` - an HTML Canvas wrapper which abtracts the Canvas away, so Renderer depends only on a simple interface
- `math.ts` - Vector and Matrix math implementation
- `obj-parser.ts` - A naive OBJ parser
- `renderer.ts` - Contains all the rendering and rasterization logic

And an example:
- `example-app/` - The application which calls into the above libraries. Contains a "game loop" and GUI controls

### Usage example
```ts
import { Canvas } from "./softy-js/canvas";
import { Renderer } from "./softy-js/renderer";
import { parseObj, parseMtl, UVFlip } from "./softy-js/obj-parser";
import {
    Vector3,
    degreesToRadians,
    makeMatrix4Identity,
    Matrix4,
    makeTranslationMatrix,
    makeScaleMatrix,
    makeRotationAroundXMatrix,
    makeRotationAroundYMatrix,
    makeRotationAroundZMatrix,
    multiplyMatrix4s,
} from "./softy-js/math";

import { suzanneRawObj, suzanneRawMtl, suzanneRawTexture } from "./my-assets/suzanne";
import { kettleRawObj, kettleRawMtl } from "./my-assets/kettle";

const canvas = Canvas.createFullscreen();
const renderer = new Renderer(canvas);

const camera = {
    position: [0, 0, -5] as Vector3,
    target: [0, 0, 0] as Vector3,
    fov: degreesToRadians(60),
    zNear: 1,
    zFar: 1,
};

const suzanneModel = parseObj(rawObj, parsMtl(rawMtl), UVFlip.Flipped);
const suzanneTexture = loadTexture(suzanneRawTexture);
const suzannePosition: Vector3 = [0, 0, 0];
const suzanneScale: Vector3 = [1, 1, 1];
const suzanneRotation: Vector3 = [0, 0, 0];

const kettleModel = parseObj(rawObj, parsMtl(rawMtl), UVFlip.Flipped);

run(): void {
    requestAnimationFrame(() => {
        renderer.startDrawing(camera);

        renderer.draw(
            suzanneModel.vertices,
            suzanneModel.uvs,
            suzanneModel.colors,
            suzanneModel.faces,
            suzanneTexture,
            suzanneModel.getModelTransform(suzannePosition, suzanneScale, suzanneRotation),
        );
        renderer.draw(
            kettleModel.vertices,
            kettleModel.uvs,
            kettleModel.colors,
            kettleModel.faces,
            null, // Fallback to flat-shaded drawing
            makeMatrix4Identity(),
        );

        renderer.finishDrawing();

        this.run();
    });
}

function calculateModelTransform(position: Vector3, scale: Vector3, rotation: Vector3): Matrix4 {
    const translation = makeTranslationMatrix(position);
    const scale = makeScaleMatrix(s.scale);
    const rotationX = makeRotationAroundXMatrix(rotation[0]);
    const rotationY = makeRotationAroundYMatrix(rotation[1]);
    const rotationZ = makeRotationAroundZMatrix(rotation[2]);

    const rotation = multiplyMatrix4s(rotationY, multiplyMatrix4s(rotationX, rotationZ));

    return multiplyMatrix4s(translation, multiplyMatrix4s(rotation, scale));
}

function loadTexture(raw: string): ImageData {
    // user-implemented
}
```

## What's not ported from the origina project
- Clipping
