# SoftyJS

[Demo](https://irvingwash.github.io/softy-js/)

SoftyJS is a port of softy, a software 3D renderer, from Jai to TypeScript.
The port, as the original project, is written completely by hand. It doesn't have any dependencies and implements a renderer/rasterizer from scratch.

It uses HTML Canvas only as a surface to put pixels into. None of the canvas drawing methods are called.
All the pixels are manually rasterized into an array and after copied into the canvas using `putImage`.

Everything, including all the rasterizing and transformation math, is done by hand without LLM assistance.

The project also contains a very naive OBJ parser which works only with specifically formatted files.

Currently it can:
- Draw filled rectangles
- Draw lines
- Draw filled triangles and triangle "wireframes"
- Load OBJ files
- Render wireframe 3D meshes
- Render flat shaded 3D meshes
- Backface culling
- Simple directional light
- Texture rasterization using barycentric weights
- Depth testing for textured triangles
- Painter's algorithm for flat-shaded triangles
- Abstracted view/model/projection matrix support

## Architecture

There are four independent libraries:
- `canvas.ts` - an HTML Canvas wrapper which abtracts the Canvas away, so Renderer depends only on a simple interface
- `math.ts` - Vector and Matrix math implementation
- `obj-parser.ts` - A naive OBJ parser
- `renderer.ts` - Contains all the rendering and rasterization logic

And an example:
- `example-app/` - The application which calls into the above libraries. Contains a "game loop" and GUI controls

## What's not ported from the origina project
- Clipping
