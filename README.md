# SoftyJS

SoftyJS is a port of softy, a software 3D renderer, from Jai to TypeScript.
The port, as the original project, is written completely by hand.

It uses HTML Canvas only as a surface to put pixels into. None of the canvas drawing methods are called.
All the pixels are rasterized into an array and after copied into the canvas using `putImage`.

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
